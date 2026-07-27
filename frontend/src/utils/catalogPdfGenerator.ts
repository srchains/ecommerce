// Shared Catalog PDF Generator Utility for SR Chains
// Generates printable/downloadable A4 tag catalogs for collections or specific variants.

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
    alert('Please allow popups in your browser to download/print the PDF catalog.');
    return;
  }

  const logoUrl = `${window.location.origin}/logo.jpg`;

  const cardsHtml = itemsList.map(({ design, variant, sizes, variantWeight }) => {
    const zoomUrl = getZoomImageUrl(design, variant);
    const rawCode = (variant?.variant_code || design?.design_code || 'SR-01').trim();
    const tagLabelCode = rawCode.replace(/\s*Z\s*$/i, '').trim();
    
    const purity = design?.purity || 70;
    const titleText = `${purity}% FINE SILVER ${design?.name || tagLabelCode}`;
    
    const targetDesignName = design?.name || design?.design_code || rawCode;
    const productUrl = `${window.location.origin}/?design=${encodeURIComponent(targetDesignName)}${variant?.id ? `&variant=${variant.id}` : ''}`;

    const sizesArr = sizes || variant?.sizes || [];
    const avgW = sizesArr.length > 0 ? (sizesArr.reduce((a: number, s: any) => a + (Number(s.weight) || 0), 0) / sizesArr.length) : 0;
    const weightText = variantWeight ? `${variantWeight.toFixed(2)}g (approx)` : avgW ? `${avgW.toFixed(2)}g (approx)` : '32.89g (approx)';

    const sizeValues = sizesArr.map((s: any) => Number(s.size));
    const minSz = sizeValues.length ? Math.min(...sizeValues).toFixed(1) : '5.0';
    const maxSz = sizeValues.length ? Math.max(...sizeValues).toFixed(1) : '11.0';
    const sizeText = sizeValues.length <= 1 ? `${minSz}"` : `${minSz}" - ${maxSz}"`;

    return `
      <div class="catalog-card">
        <a href="${productUrl}" target="_blank" title="Click to view product on website" style="text-decoration: none; color: inherit; display: block;">
          <div class="image-box">
            <img src="${zoomUrl}" alt="${tagLabelCode}" />
          </div>
        </a>
        <a href="${productUrl}" target="_blank" title="Click to view product on website" style="text-decoration: none; color: inherit;">
          <div class="item-title">${titleText}</div>
        </a>
        <div class="item-info">
          <strong>Tag Label:</strong> ${tagLabelCode}<br />
          <strong>Weight:</strong> ${weightText}<br />
          <strong>Size:</strong> ${sizeText}<br />
          <strong>Touch:</strong> ${purity}%
        </div>
      </div>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>SR_CHAINS_${title.replace(/[^a-zA-Z0-9_\-]/g, '_')}_Catalog</title>
      <meta charset="utf-8" />
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
        .header-table {
          width: 100%;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .company-name {
          font-size: 20px;
          font-weight: 900;
          color: #b45309;
          letter-spacing: 0.5px;
          margin: 0 0 2px 0;
          text-transform: uppercase;
        }
        .company-details {
          font-size: 10px;
          color: #4b5563;
          line-height: 1.45;
        }
        .contact-details {
          text-align: right;
          font-size: 10px;
          color: #374151;
          line-height: 1.45;
        }
        .catalog-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px 16px;
        }
        .catalog-card {
          page-break-inside: avoid;
          break-inside: avoid;
          text-align: center;
          background: #ffffff;
          padding: 4px;
        }
        .image-box {
          width: 100%;
          height: 220px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }
        .image-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }
        .item-title {
          font-size: 11.5px;
          font-weight: 900;
          color: #1d4ed8;
          text-transform: uppercase;
          margin-bottom: 4px;
          line-height: 1.25;
        }
        .item-info {
          font-size: 10px;
          color: #111827;
          font-weight: 700;
          line-height: 1.45;
        }
        .item-info strong {
          font-weight: 800;
          color: #000000;
        }
        .action-bar {
          position: fixed;
          top: 16px;
          right: 16px;
          display: flex;
          gap: 10px;
          z-index: 99999;
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
        <button class="print-btn" onclick="window.print()">📥 Download PDF / Print Catalog</button>
      </div>

      <table class="header-table">
        <tr>
          <td style="vertical-align: top;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
              <img src="${logoUrl}" alt="SR Chains Logo" style="height: 48px; width: 48px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1;" />
              <div>
                <h1 class="company-name" style="margin: 0; line-height: 1.1;">SR CHAINS</h1>
                <div style="font-size: 10px; font-weight: 800; color: #d97706; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">B2B Silver Jewelry • ${title}</div>
              </div>
            </div>
            <div class="company-details">
              <strong>Contact & Registered Office:</strong><br />
              64, Arumuga Pillayar Koil Street,<br />
              Gugai,<br />
              Salem - 636 005
            </div>
          </td>
          <td style="vertical-align: top;" class="contact-details">
            <div style="font-size: 16px; font-weight: 900; color: #0f172a; margin-bottom: 4px;">SR CHAINS</div>
            <div>
              <strong>Ph no :</strong> 70106 74487<br />
              <strong>Email :</strong> srchains19@gmail.com
            </div>
          </td>
        </tr>
      </table>

      <div class="catalog-grid">
        ${cardsHtml}
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
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
