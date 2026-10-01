// Shared Catalog PDF Generator Utility for SR Chains
// Generates 100% non-blank, non-sliced downloadable & printable A4 catalogs.

export interface PdfCatalogItem {
  design: any;
  variant: any;
  sizes?: any[];
  variantWeight?: number;
  /** Collection name; in the combined "All" PDF each section starts on a new page. */
  section?: string;
}

export const toAbsoluteUrl = (url?: string): string => {
  if (!url) return `${window.location.origin}/logo.jpg`;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const getZoomImageUrl = (design?: any, variant?: any): string => {
  const isZoom = (m: any) => {
    const fn = String(m?.file_name || '').toUpperCase();
    const url = String(m?.url || '').toUpperCase();
    const cat = String(m?.category || '').toUpperCase();
    return (
      fn.includes(' Z') || 
      fn.includes('_Z') || 
      fn.endsWith('Z') || 
      url.includes(' Z') || 
      url.includes('_Z') || 
      cat.includes('ZOOM') || 
      cat === 'Z'
    );
  };

  // 1. Check variant media for Zoom image Z
  if (variant?.media && variant.media.length > 0) {
    const zImg = variant.media.find(isZoom);
    if (zImg?.url) return toAbsoluteUrl(zImg.url);
    const firstImg = variant.media.find((m: any) => m.file_type?.startsWith('image') || m.url);
    if (firstImg?.url) return toAbsoluteUrl(firstImg.url);
  }

  // 2. Check design media for Zoom image Z
  if (design?.media && design.media.length > 0) {
    const zImg = design.media.find(isZoom);
    if (zImg?.url) return toAbsoluteUrl(zImg.url);
    const firstImg = design.media.find((m: any) => m.file_type?.startsWith('image') || m.url);
    if (firstImg?.url) return toAbsoluteUrl(firstImg.url);
  }

  // 3. Check design variants media fallback
  if (design?.variants && design.variants.length > 0) {
    for (const v of design.variants) {
      if (v.media && v.media.length > 0) {
        const zImg = v.media.find(isZoom);
        if (zImg?.url) return toAbsoluteUrl(zImg.url);
        const firstImg = v.media.find((m: any) => m.file_type?.startsWith('image') || m.url);
        if (firstImg?.url) return toAbsoluteUrl(firstImg.url);
      }
    }
  }

  return toAbsoluteUrl('/logo.jpg');
};

export const generateCatalogPDF = (
  title: string,
  itemsList: PdfCatalogItem[],
  // Kept for backward compatibility with callers; every catalogue now uses the same image-only layout.
  _options: { compact?: boolean } = {}
) => {
  if (!itemsList || itemsList.length === 0) {
    alert('No catalog items to export.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups in your browser to download or print the PDF catalog.');
    return;
  }

  const logoUrl = toAbsoluteUrl('/logo.jpg');
  const safeFileName = `SR_CHAINS_${title.replace(/[^a-zA-Z0-9_\-]/g, '_')}_Catalog.pdf`;

  // Image-only catalogue: exactly 3 full-width images per A4 page, no names/codes/captions.
  // Fixed 3 slots per page, so an image is never split across two pages.
  const IMAGES_PER_PAGE = 3;
  const pagesHtml: string[] = [];
  for (let start = 0; start < itemsList.length; start += IMAGES_PER_PAGE) {
    const slots = itemsList.slice(start, start + IMAGES_PER_PAGE).map(({ design, variant }) => {
      const zoomUrl = getZoomImageUrl(design, variant);
      // Background image (not <img object-fit>): html2canvas renders background-size: contain correctly
      return `<div class="card-img" data-src="${zoomUrl}" style="background-image: url('${zoomUrl}');"></div>`;
    });
    while (slots.length < IMAGES_PER_PAGE) slots.push('<div class="card-img card-empty"></div>');
    pagesHtml.push(`<div class="a4-page">${slots.join('')}</div>`);
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>${safeFileName.replace('.pdf', '')}</title>
      <meta charset="utf-8" />
      <base href="${window.location.origin}/" />
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
      <style>
        @page {
          size: A4;
          margin: 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #f1f5f9;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
        }
        .action-bar {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(8px);
          color: #ffffff;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 999999;
          box-shadow: 0 4px 20px rgba(0,0,0,0.25);
        }
        .action-title {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .download-btn {
          background: linear-gradient(135deg, #d97706, #b45309);
          color: #ffffff;
          border: 1px solid #f59e0b;
          padding: 8px 18px;
          border-radius: 8px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .download-btn:hover {
          background: linear-gradient(135deg, #b45309, #92400e);
          transform: translateY(-1px);
        }
        .print-btn {
          background: #334155;
          color: #ffffff;
          border: 1px solid #475569;
          padding: 8px 18px;
          border-radius: 8px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .print-btn:hover {
          background: #475569;
          transform: translateY(-1px);
        }
        .close-btn {
          background: transparent;
          color: #94a3b8;
          border: 1px solid #334155;
          padding: 8px 14px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }
        .close-btn:hover {
          color: #ffffff;
          background: #1e293b;
        }
        .status-badge {
          font-size: 11px;
          color: #fbbf24;
          font-weight: 700;
        }

        /* A4 Page Container on Screen */
        .a4-page {
          width: 210mm;
          min-height: 297mm;
          max-height: 297mm;
          background: #ffffff;
          margin: 20px auto;
          padding: 10mm;
          box-shadow: 0 4px 25px rgba(0,0,0,0.12);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 4mm;
          box-sizing: border-box;
          page-break-after: always;
          break-after: page;
          page-break-inside: avoid;
          break-inside: avoid;
          position: relative;
        }

        /* One image per slot: 3 equal slots fill the page. No names, no card boxes. */
        .card-img {
          flex: 1 1 0;
          min-height: 0;
          width: 100%;
          background-color: #ffffff;
          background-size: contain;
          background-position: center;
          background-repeat: no-repeat;
          border: 1px solid #f1f5f9;
        }
        .card-empty { border-color: transparent; }

        /* While saving the PDF: each .a4-page is captured on its own at exact A4 size */
        body.pdf-capture .a4-page {
          width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          margin: 0 auto !important;
          box-shadow: none !important;
          border-radius: 0 !important;
        }

        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .action-bar {
            display: none !important;
          }
          .a4-page {
            width: 100% !important;
            height: 277mm !important;
            min-height: 277mm !important;
            max-height: 277mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .a4-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          td {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="action-bar no-print">
        <div class="action-title">
          <span>✨ SR CHAINS — ${title}</span>
          <span class="status-badge" id="status-indicator">⏳ Preloading Images...</span>
        </div>
        <div class="btn-group">
          <button class="download-btn" onclick="savePdfFile()">
            <span>📥 Save A4 PDF</span>
          </button>
          <button class="print-btn" onclick="window.print()">
            <span>🖨️ Print Catalog</span>
          </button>
          <button class="close-btn" onclick="window.close()">✕ Close</button>
        </div>
      </div>

      <div id="pdf-root">
        ${pagesHtml.join('')}
      </div>

      <script>
        var statusEl = document.getElementById('status-indicator');
        function setStatus(text, color) {
          if (!statusEl) return;
          statusEl.innerText = text;
          if (color) statusEl.style.color = color;
        }

        // Load every image (logo <img> + card background images) before capturing
        function preloadImages() {
          var urls = Array.from(document.querySelectorAll('img')).map(function (img) { return img.src; })
            .concat(Array.from(document.querySelectorAll('.card-img')).map(function (el) { return el.getAttribute('data-src'); }))
            .filter(Boolean);
          var done = 0;
          return Promise.all(urls.map(function (url) {
            return new Promise(function (resolve) {
              var probe = new Image();
              probe.onload = probe.onerror = function () {
                if (!probe.naturalWidth) {
                  // Broken image: fall back to the logo so the card is not empty
                  document.querySelectorAll('.card-img[data-src="' + url + '"]').forEach(function (el) {
                    el.style.backgroundImage = "url('${logoUrl}')";
                  });
                }
                done++;
                setStatus('⏳ Loading images (' + done + '/' + urls.length + ')...');
                resolve();
              };
              probe.src = url;
            });
          }));
        }

        var saving = false;
        // One catalogue page -> exactly one A4 PDF page (no slicing across pages)
        async function savePdfFile() {
          if (saving) return;
          if (!window.html2canvas || !window.jspdf) { window.print(); return; }
          saving = true;
          try {
            await imagesReady;
            document.body.classList.add('pdf-capture');
            var pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
            var pages = Array.from(document.querySelectorAll('.a4-page'));
            for (var i = 0; i < pages.length; i++) {
              setStatus('⏳ Creating PDF page ' + (i + 1) + ' of ' + pages.length + '...', '#fbbf24');
              var canvas = await html2canvas(pages[i], { scale: 3, useCORS: true, backgroundColor: '#ffffff', logging: false });
              if (i > 0) pdf.addPage();
              pdf.addImage(canvas.toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, 210, 297);
            }
            pdf.save('${safeFileName}');
            setStatus('✅ PDF downloaded • click "Save A4 PDF" to download again', '#34d399');
          } catch (err) {
            console.error(err);
            setStatus('⚠️ Could not create the PDF. Use Print → Save as PDF.', '#f87171');
          } finally {
            document.body.classList.remove('pdf-capture');
            saving = false;
          }
        }

        var imagesReady = preloadImages();
        // Download the PDF straight away once everything has loaded
        window.addEventListener('load', function () { imagesReady.then(savePdfFile); });
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

/** Key used by the Catalogue Manager for the "All Collections" PDF. */
export const ALL_COLLECTIONS_KEY = '__all__';

/** What the admin lets buyers download (see backend/app/routers/catalogue.py). */
export interface CatalogueFilter {
  collections: string[];
  hiddenDesignIds: number[];
  hiddenVariantIds: number[];
}

/** Which Download Catalogue group a design belongs to (mirrors backend/app/routers/catalogue.py). */
export const getCatalogueCollectionName = (design: any, categories: any[] = []): string | null => {
  const catName = categories.find(c => c.id === design.category_id)?.name;
  if (catName) return catName;
  if (design.collection && design.collection.trim()) return design.collection.trim();
  if (design.name && design.name.trim()) return design.name.split('-')[0].trim();
  return null;
};

/** Sorted, de-duplicated collection names shown in the Download Catalogue menus. */
export const getCatalogueCollections = (designs: any[], categories: any[] = []): string[] =>
  Array.from(
    new Set(
      designs
        .filter(d => d.status === 'Active' || !d.status)
        .map(d => getCatalogueCollectionName(d, categories))
        .filter(Boolean) as string[]
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

export const downloadCatalogPDFForCollection = (
  collectionName: string,
  designs: any[],
  categories: any[] = [],
  /** Buyer selection from Catalogue Manager: only these collections, minus hidden designs/variants. */
  filter?: CatalogueFilter
) => {
  const items: PdfCatalogItem[] = [];

  const allowed = filter ? new Set(filter.collections) : null;
  const hiddenDesigns = new Set(filter?.hiddenDesignIds || []);
  const hiddenVariants = new Set(filter?.hiddenVariantIds || []);
  const activeDesigns = designs.filter(d =>
    (d.status === 'Active' || !d.status) &&
    !hiddenDesigns.has(d.id) &&
    (!allowed || allowed.has(getCatalogueCollectionName(d, categories) || ''))
  );

  activeDesigns.forEach(design => {
    const catName = categories.find(c => c.id === design.category_id)?.name || '';
    const collName = design.collection || '';
    const designCode = design.design_code || '';
    const name = design.name || '';

    let matches = false;
    if (collectionName === 'All' || collectionName === 'All Collections' || !collectionName) {
      matches = true;
    } else {
      const target = collectionName.toLowerCase().trim();
      matches = Boolean(
        catName.toLowerCase().trim() === target ||
        collName.toLowerCase().trim() === target ||
        collName.toLowerCase().includes(target) ||
        designCode.toLowerCase().includes(target) ||
        name.toLowerCase().includes(target)
      );
    }

    if (matches && design.variants && design.variants.length > 0) {
      design.variants.forEach((variant: any) => {
        if (hiddenVariants.has(variant.id)) return;
        let variantWeight = 0;
        if (variant.sizes && variant.sizes.length > 0) {
          variantWeight = variant.sizes.reduce((acc: number, s: any) => acc + ((Number(s.stock_available) || 0) * (Number(s.weight) || 0)), 0);
        }
        items.push({
          design,
          variant,
          sizes: variant.sizes,
          variantWeight: variantWeight || undefined
        });
      });
    }
  });

  const isAll = collectionName === 'All' || collectionName === 'All Collections' || !collectionName;
  const displayTitle = isAll ? 'All Collections' : `${collectionName}`;

  if (isAll) {
    // Combined PDF: collections in the same order as the dropdown, flowing continuously.
    const order = getCatalogueCollections(designs, categories);
    const collectionOf = (item: PdfCatalogItem) => getCatalogueCollectionName(item.design, categories) || '';
    const rank = (item: PdfCatalogItem) => { const i = order.indexOf(collectionOf(item)); return i === -1 ? order.length : i; };
    items.sort((a, b) => rank(a) - rank(b)); // stable: keeps design order inside a collection
  }

  generateCatalogPDF(displayTitle, items, { compact: isAll });
};
