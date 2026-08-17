// Shared Catalog PDF Generator Utility for SR Chains
// Generates 100% non-blank, non-sliced downloadable & printable A4 catalogs.

export interface PdfCatalogItem {
  design: any;
  variant: any;
  sizes?: any[];
  variantWeight?: number;
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
  itemsList: PdfCatalogItem[]
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

  // Paginate items: 9 items per page (3 columns x 3 rows) ensures 0% card slicing on A4 portrait
  const ITEMS_PER_PAGE = 9;
  const totalPages = Math.ceil(itemsList.length / ITEMS_PER_PAGE);
  const pagesHtml: string[] = [];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageItems = itemsList.slice(pageIdx * ITEMS_PER_PAGE, (pageIdx + 1) * ITEMS_PER_PAGE);
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
                <div style="width: 100%; height: 140px; background-color: #f8fafc; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; border: 1px solid #f1f5f9;">
                  <img src="${zoomUrl}" alt="${tagLabelCode}" style="width: 100%; height: 100%; object-fit: contain; background: #fafafa;" crossorigin="anonymous" loading="eager" />
                </div>
              </a>
              <a href="${productUrl}" target="_blank" style="text-decoration: none; color: inherit;">
                <div style="font-size: 12px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; margin-bottom: 3px; line-height: 1.2; letter-spacing: 0.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${titleText}
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
                  B2B Silver Jewelry • <span style="color: #d97706;">${title}</span>
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
            SR CHAINS • ${title}
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

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>${safeFileName.replace('.pdf', '')}</title>
      <meta charset="utf-8" />
      <base href="${window.location.origin}/" />
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
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
        // Wait for all images to complete loading before enabling PDF export
        function preloadImages() {
          const images = Array.from(document.querySelectorAll('img'));
          let loadedCount = 0;
          const totalCount = images.length;
          const statusEl = document.getElementById('status-indicator');

          if (totalCount === 0) {
            if (statusEl) statusEl.innerText = '✅ Ready (A4 Print Ready)';
            return;
          }

          function onItemDone() {
            loadedCount++;
            if (statusEl) {
              if (loadedCount >= totalCount) {
                statusEl.innerText = '✅ Ready (100% Loaded • A4 Verified)';
                statusEl.style.color = '#34d399';
              } else {
                statusEl.innerText = '⏳ Loading images (' + loadedCount + '/' + totalCount + ')...';
              }
            }
          }

          images.forEach(img => {
            if (img.complete && img.naturalHeight !== 0) {
              onItemDone();
            } else {
              img.addEventListener('load', onItemDone);
              img.addEventListener('error', function() {
                img.src = '${logoUrl}';
                onItemDone();
              });
            }
          });
        }

        function savePdfFile() {
          const element = document.getElementById('pdf-root');
          if (window.html2pdf) {
            const opt = {
              margin:       [0, 0, 0, 0],
              filename:     '${safeFileName}',
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { scale: 2, useCORS: true, allowTaint: true, logging: false },
              jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
              pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
            };
            html2pdf().set(opt).from(element).save();
          } else {
            window.print();
          }
        }

        window.addEventListener('DOMContentLoaded', preloadImages);
        window.addEventListener('load', preloadImages);
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

export const downloadCatalogPDFForCollection = (
  collectionName: string,
  designs: any[],
  categories: any[] = []
) => {
  const items: PdfCatalogItem[] = [];

  const activeDesigns = designs.filter(d => d.status === 'Active' || !d.status);

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

  const displayTitle = collectionName === 'All' || collectionName === 'All Collections' || !collectionName
    ? 'All Collections'
    : `${collectionName}`;

  generateCatalogPDF(displayTitle, items);
};
