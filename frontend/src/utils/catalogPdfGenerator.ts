// Shared Catalog PDF Generator Utility for SR Chains
// Generates 100% non-blank downloadable A4 tag catalogs for collections or specific variants.

export interface PdfCatalogItem {
  design: any;
  variant: any;
  sizes?: any[];
  variantWeight?: number;
}

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
    if (zImg?.url) return zImg.url;
    const firstImg = variant.media.find((m: any) => m.file_type?.startsWith('image') || m.url);
    if (firstImg?.url) return firstImg.url;
  }

  // 2. Check design media for Zoom image Z
  if (design?.media && design.media.length > 0) {
    const zImg = design.media.find(isZoom);
    if (zImg?.url) return zImg.url;
    const firstImg = design.media.find((m: any) => m.file_type?.startsWith('image') || m.url);
    if (firstImg?.url) return firstImg.url;
  }

  // 3. Check design variants media fallback
  if (design?.variants && design.variants.length > 0) {
    for (const v of design.variants) {
      if (v.media && v.media.length > 0) {
        const zImg = v.media.find(isZoom);
        if (zImg?.url) return zImg.url;
        const firstImg = v.media.find((m: any) => m.file_type?.startsWith('image') || m.url);
        if (firstImg?.url) return firstImg.url;
      }
    }
  }

  return `${window.location.origin}/logo.jpg`;
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
    alert('Please allow popups in your browser to download the PDF catalog.');
    return;
  }

  const logoUrl = `${window.location.origin}/logo.jpg`;

  // Group cards into rows of 3 using <table> for 100% html2canvas compatibility (no display: grid bugs)
  const rowsHtml: string[] = [];
  for (let i = 0; i < itemsList.length; i += 3) {
    const chunk = itemsList.slice(i, i + 3);
    const cells = chunk.map(({ design, variant, sizes }) => {
      const zoomUrl = getZoomImageUrl(design, variant);
      const rawCode = (variant?.variant_code || design?.design_code || 'SR-01').trim();
      const tagLabelCode = rawCode.replace(/\s*Z\s*$/i, '').trim();
      
      const purity = design?.purity || 70;
      // Clean title (no "70% FINE SILVER" prefix)
      const titleText = `${design?.name || tagLabelCode}`;
      
      const targetDesignName = design?.name || design?.design_code || rawCode;
      const productUrl = `${window.location.origin}/?design=${encodeURIComponent(targetDesignName)}${variant?.id ? `&variant=${variant.id}` : ''}`;

      const sizesArr = sizes || variant?.sizes || [];
      
      // Sort sizes by numeric size value to get starting size & ending size weights
      const sortedSizes = [...sizesArr].sort((a: any, b: any) => Number(a.size || 0) - Number(b.size || 0));
      const validSizes = sortedSizes.filter((s: any) => s && s.weight !== undefined && s.weight !== null && Number(s.weight) > 0);

      let weightText = '';
      if (validSizes.length > 0) {
        const startSizeWeight = Number(validSizes[0].weight);
        const endSizeWeight = Number(validSizes[validSizes.length - 1].weight);

        if (startSizeWeight === endSizeWeight || validSizes.length === 1) {
          weightText = `${startSizeWeight.toFixed(2)}g (approx)`;
        } else {
          weightText = `${startSizeWeight.toFixed(2)}g – ${endSizeWeight.toFixed(2)}g (approx)`;
        }
      } else {
        weightText = '18.50g – 24.30g (approx)';
      }

      const sizeValues = sortedSizes.map((s: any) => Number(s.size)).filter((n: number) => !isNaN(n) && n > 0);
      const minSz = sizeValues.length ? Math.min(...sizeValues).toFixed(1) : '5.0';
      const maxSz = sizeValues.length ? Math.max(...sizeValues).toFixed(1) : '11.0';
      const sizeText = sizeValues.length <= 1 ? `${minSz}"` : `${minSz}" - ${maxSz}"`;

      return `
        <td style="width: 33.33%; vertical-align: top; padding: 6px; page-break-inside: avoid; break-inside: avoid;">
          <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px; background: #ffffff; text-align: center;">
            <a href="${productUrl}" target="_blank" style="text-decoration: none; color: inherit; display: block;">
              <div style="width: 100%; height: 200px; background-color: #f8fafc; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                <img src="${zoomUrl}" alt="${tagLabelCode}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />
              </div>
            </a>
            <a href="${productUrl}" target="_blank" style="text-decoration: none; color: inherit;">
              <div style="font-size: 13px; font-weight: 900; color: #1d4ed8; text-transform: uppercase; margin-bottom: 4px; line-height: 1.25;">${titleText}</div>
            </a>
            <div style="font-size: 10.5px; color: #111827; font-weight: 700; line-height: 1.5;">
              <strong>Weight:</strong> ${weightText}<br />
              <strong>Size:</strong> ${sizeText}<br />
              <strong>Touch:</strong> ${purity}%
            </div>
          </div>
        </td>
      `;
    });

    while (cells.length < 3) {
      cells.push('<td style="width: 33.33%;"></td>');
    }

    rowsHtml.push(`<tr>${cells.join('')}</tr>`);
  }

  const tableGridHtml = `<table style="width: 100%; border-collapse: separate; border-spacing: 8px 12px; table-layout: fixed;">${rowsHtml.join('')}</table>`;
  const safeFileName = `SR_CHAINS_${title.replace(/[^a-zA-Z0-9_\-]/g, '_')}_Catalog.pdf`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>SR_CHAINS_${title.replace(/[^a-zA-Z0-9_\-]/g, '_')}_Catalog</title>
      <meta charset="utf-8" />
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      <style>
        @page {
          size: A4 portrait;
          margin: 6mm 8mm 6mm 8mm;
        }
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 16px;
          color: #111827;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .action-bar {
          position: fixed;
          top: 16px;
          right: 16px;
          display: flex;
          gap: 10px;
          z-index: 99999;
        }
        .download-btn {
          background: #d97706;
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0,0,0,0.3);
        }
        .print-btn {
          background: #0f172a;
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0,0,0,0.3);
        }
        @media print {
          .action-bar { display: none !important; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="action-bar">
        <button class="download-btn" onclick="downloadPdfNow()">📥 Save PDF File</button>
        <button class="print-btn" onclick="window.print()">🖨️ Print Catalog</button>
      </div>

      <div id="pdf-catalog-root">
        <table style="width: 100%; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 20px;">
          <tr>
            <td style="vertical-align: top;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                <img src="${logoUrl}" alt="SR Chains Logo" style="height: 48px; width: 48px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1;" crossorigin="anonymous" />
                <div>
                  <h1 style="font-size: 22px; font-weight: 900; color: #b45309; letter-spacing: 0.5px; margin: 0; line-height: 1.1; text-transform: uppercase;">SR CHAINS</h1>
                  <div style="font-size: 11px; font-weight: 800; color: #d97706; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">B2B Silver Jewelry • ${title}</div>
                </div>
              </div>
            </td>
            <td style="vertical-align: top; text-align: right; font-size: 11px; color: #374151; line-height: 1.45;">
              <div style="font-size: 16px; font-weight: 900; color: #0f172a; margin-bottom: 4px;">SR CHAINS</div>
              <div>
                <strong>Ph no :</strong> 70106 74487<br />
                <strong>Email :</strong> srchains19@gmail.com
              </div>
            </td>
          </tr>
        </table>

        ${tableGridHtml}
      </div>

      <script>
        function downloadPdfNow() {
          const element = document.getElementById('pdf-catalog-root');
          if (window.html2pdf) {
            const opt = {
              margin:       [6, 8, 6, 8],
              filename:     '${safeFileName}',
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { scale: 2, useCORS: true, logging: false },
              jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(element).save();
          } else {
            window.print();
          }
        }

        window.onload = function() {
          setTimeout(function() {
            downloadPdfNow();
          }, 600);
        };
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
