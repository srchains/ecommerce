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
  /** compact: continuous 4-column grid of image + name cards, no header/footer (combined "Download All" PDF). */
  options: { compact?: boolean } = {}
) => {
  const compact = !!options.compact;
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

  // Paginate items: 9 items per page (3 columns x 3 rows) ensures 0% card slicing on A4 portrait
  // A new section (collection) always starts on a fresh page.
  const ITEMS_PER_PAGE = 9;
  const pageChunks: { section?: string; items: PdfCatalogItem[] }[] = [];
  itemsList.forEach(item => {
    const last = pageChunks[pageChunks.length - 1];
    if (last && last.section === item.section && last.items.length < ITEMS_PER_PAGE) {
      last.items.push(item);
    } else {
      pageChunks.push({ section: item.section, items: [item] });
    }
  });
  const totalPages = pageChunks.length;
  const pagesHtml: string[] = [];

  for (let pageIdx = 0; !compact && pageIdx < totalPages; pageIdx++) {
    const pageItems = pageChunks[pageIdx].items;
    const pageSection = pageChunks[pageIdx].section;
    const sectionLabel = pageSection ? ` • <span style="color: #1e3a8a;">${pageSection}</span>` : '';
    const pageNum = pageIdx + 1;

    // Group pageItems into rows of 3
    const rowsHtml: string[] = [];
    for (let r = 0; r < pageItems.length; r += 3) {
      const rowChunk = pageItems.slice(r, r + 3);
      const cells = rowChunk.map(({ design, variant, sizes }) => {
        const zoomUrl = getZoomImageUrl(design, variant);
        const rawCode = (variant?.variant_code || design?.design_code || 'SR-01').trim();
        const tagLabelCode = rawCode.replace(/\s*Z\s*$/i, '').trim();
        const purity = design?.purity || 70;
        const titleText = `${design?.name || tagLabelCode}`;
        const targetDesignName = design?.name || design?.design_code || rawCode;
        const productUrl = `${window.location.origin}/?design=${encodeURIComponent(targetDesignName)}${variant?.id ? `&variant=${variant.id}` : ''}`;

        const sizesArr = sizes || variant?.sizes || [];
        const sortedSizes = [...sizesArr].sort((a: any, b: any) => Number(a.size || 0) - Number(b.size || 0));
        const validSizes = sortedSizes.filter((s: any) => s && s.weight !== undefined && s.weight !== null && Number(s.weight) > 0);

        let weightText = '';
        if (validSizes.length > 0) {
          const startSizeWeight = Number(validSizes[0].weight);
          const endSizeWeight = Number(validSizes[validSizes.length - 1].weight);
          if (startSizeWeight === endSizeWeight || validSizes.length === 1) {
            weightText = `${startSizeWeight.toFixed(2)}g`;
          } else {
            weightText = `${startSizeWeight.toFixed(2)}g – ${endSizeWeight.toFixed(2)}g`;
          }
        } else {
          weightText = '18.50g – 24.30g';
        }

        const sizeValues = sortedSizes.map((s: any) => Number(s.size)).filter((n: number) => !isNaN(n) && n > 0);
        const minSz = sizeValues.length ? Math.min(...sizeValues).toFixed(1) : '5.0';
        const maxSz = sizeValues.length ? Math.max(...sizeValues).toFixed(1) : '11.0';
        const sizeText = sizeValues.length <= 1 ? `${minSz}"` : `${minSz}" - ${maxSz}"`;

        return `
          <td style="width: 33.33%; vertical-align: top; padding: 4px; box-sizing: border-box;">
            <div style="border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 6px 8px; background: #ffffff; text-align: center; height: 100%; box-sizing: border-box;">
              <a href="${productUrl}" target="_blank" style="text-decoration: none; color: inherit; display: block;">
                <!-- Background image (not <img object-fit>): html2canvas renders background-size: contain correctly -->
                <div class="card-img" data-src="${zoomUrl}" style="width: 100%; height: 140px; background-color: #fafafa; background-image: url('${zoomUrl}'); background-size: contain; background-position: center; background-repeat: no-repeat; border-radius: 6px; margin-bottom: 6px; border: 1px solid #f1f5f9;"></div>
              </a>
              <a href="${productUrl}" target="_blank" style="text-decoration: none; color: inherit;">
                <div style="font-size: 12px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; line-height: 1.2; letter-spacing: 0.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${titleText}
                </div>
                <div style="font-size: 9.5px; font-weight: 700; color: #64748b; margin: 1px 0 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${tagLabelCode !== titleText ? `${tagLabelCode}${variant?.variant_name ? ` • ${variant.variant_name}` : ''}` : (variant?.variant_name || '&nbsp;')}
                </div>
              </a>
              <div style="font-size: 10px; color: #0f172a; font-weight: 700; line-height: 1.45; background: #f8fafc; border-radius: 4px; padding: 4px; border: 1px solid #e2e8f0;">
                <div><span style="color: #64748b;">Weight:</span> <strong style="color: #0f172a;">${weightText}</strong></div>
                <div><span style="color: #64748b;">Size:</span> <strong style="color: #0f172a;">${sizeText}</strong> • <span style="color: #b45309;">Touch: <strong>${purity}%</strong></span></div>
              </div>
            </div>
          </td>
        `;
      });

      while (cells.length < 3) {
        cells.push('<td style="width: 33.33%; padding: 4px;"></td>');
      }

      rowsHtml.push(`<tr>${cells.join('')}</tr>`);
    }

    const tableGridHtml = `<table style="width: 100%; border-collapse: separate; border-spacing: 4px 6px; table-layout: fixed; margin: 0; padding: 0;">${rowsHtml.join('')}</table>`;

    // Header HTML (Full header for page 1, slim header for subsequent pages)
    const headerHtml = pageNum === 1 ? `
      <table style="width: 100%; border-bottom: 2px solid #b45309; padding-bottom: 8px; margin-bottom: 10px;">
        <tr>
          <td style="vertical-align: middle; width: 60%;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${logoUrl}" alt="SR Chains" style="height: 42px; width: 42px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1;" crossorigin="anonymous" />
              <div>
                <h1 style="font-size: 20px; font-weight: 900; color: #b45309; letter-spacing: 0.5px; margin: 0; line-height: 1; text-transform: uppercase;">SR CHAINS</h1>
                <div style="font-size: 10px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 3px;">
                  B2B Silver Jewelry • <span style="color: #d97706;">${title}</span>${sectionLabel}
                </div>
              </div>
            </div>
          </td>
          <td style="vertical-align: middle; text-align: right; width: 40%; font-size: 9.5px; color: #334155; line-height: 1.35;">
            <div style="font-weight: 800; color: #0f172a; font-size: 11px;">64, Arumuga Pillayar Koil St, Salem - 5</div>
            <div>Ph: <strong>70106 74487</strong> • srchains19@gmail.com</div>
          </td>
        </tr>
      </table>
    ` : `
      <table style="width: 100%; border-bottom: 1.5px solid #d97706; padding-bottom: 4px; margin-bottom: 8px;">
        <tr>
          <td style="vertical-align: middle; font-size: 11px; font-weight: 900; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px;">
            SR CHAINS • ${title}${sectionLabel}
          </td>
          <td style="vertical-align: middle; text-align: right; font-size: 9.5px; color: #64748b; font-weight: 700;">
            Ph: 70106 74487 • Page ${pageNum} of ${totalPages}
          </td>
        </tr>
      </table>
    `;

    // Footer HTML
    const footerHtml = `
      <div style="border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 4px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; font-weight: 600;">
        <span>© SR Chains • Pure 92.5 & 70% Silver Jewelry Manufacturer</span>
        <span>Page ${pageNum} of ${totalPages}</span>
      </div>
    `;

    pagesHtml.push(`
      <div class="a4-page" id="page-${pageNum}">
        ${headerHtml}
        <div class="grid-container" style="flex: 1;">
          ${tableGridHtml}
        </div>
        ${footerHtml}
      </div>
    `);
  }

  if (compact) {
    // Products flow continuously in one grid (collection order kept, no break per collection).
    // Fixed rows per page, so a card is never split across two A4 pages.
    const COLUMNS = 4;
    const ROWS_PER_PAGE = 7;
    const perPage = COLUMNS * ROWS_PER_PAGE;
    for (let start = 0; start < itemsList.length; start += perPage) {
      const pageItems = itemsList.slice(start, start + perPage);
      const rows: string[] = [];
      for (let r = 0; r < pageItems.length; r += COLUMNS) {
        const cells = pageItems.slice(r, r + COLUMNS).map(({ design, variant }) => {
          const zoomUrl = getZoomImageUrl(design, variant);
          const rawCode = (variant?.variant_code || design?.design_code || 'SR-01').trim();
          const name = design?.name || rawCode.replace(/\s*Z\s*$/i, '').trim();
          const productUrl = `${window.location.origin}/?design=${encodeURIComponent(design?.name || design?.design_code || rawCode)}${variant?.id ? `&variant=${variant.id}` : ''}`;
          return `
            <td style="width: ${100 / COLUMNS}%; vertical-align: top; padding: 3px;">
              <a href="${productUrl}" target="_blank" style="display: block; text-decoration: none; color: inherit; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px; background: #ffffff; text-align: center;">
                <!-- Background image (not <img object-fit>): html2canvas renders background-size: contain correctly -->
                <div class="card-img" data-src="${zoomUrl}" style="width: 100%; height: 100px; background-color: #fafafa; background-image: url('${zoomUrl}'); background-size: contain; background-position: center; background-repeat: no-repeat; border-radius: 4px;"></div>
                <div style="font-size: 11px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</div>
              </a>
            </td>
          `;
        });
        while (cells.length < COLUMNS) cells.push(`<td style="width: ${100 / COLUMNS}%; padding: 3px;"></td>`);
        rows.push(`<tr>${cells.join('')}</tr>`);
      }
      pagesHtml.push(`
        <div class="a4-page" style="justify-content: flex-start;">
          <div class="grid-container">
            <table style="width: 100%; border-collapse: separate; border-spacing: 2px 4px; table-layout: fixed;">${rows.join('')}</table>
          </div>
        </div>
      `);
    }
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
          size: A4 portrait;
          margin: 0;
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
          padding: 8mm 10mm 6mm 10mm;
          box-shadow: 0 4px 25px rgba(0,0,0,0.12);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          page-break-after: always;
          break-after: page;
          page-break-inside: avoid;
          break-inside: avoid;
          position: relative;
        }

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
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 8mm 10mm 6mm 10mm !important;
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
              var canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
              if (i > 0) pdf.addPage();
              pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
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
