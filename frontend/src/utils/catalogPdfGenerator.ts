// Shared Catalog PDF Generator Utility for SR Chains
// Directly downloads PDF files in the background without opening print popups or new tabs.

import html2pdf from 'html2pdf.js';

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

  const logoUrl = `${window.location.origin}/logo.jpg`;

  const cardsHtml = itemsList.map(({ design, variant, sizes, variantWeight }) => {
    const zoomUrl = getZoomImageUrl(design, variant);
    const rawCode = (variant?.variant_code || design?.design_code || 'SR-01').trim();
    const tagLabelCode = rawCode.replace(/\s*Z\s*$/i, '').trim();
    
    const purity = design?.purity || 70;
    // Clean title (no "70% FINE SILVER" prefix)
    const titleText = `${design?.name || tagLabelCode}`;

    const sizesArr = sizes || variant?.sizes || [];
    const avgW = sizesArr.length > 0 ? (sizesArr.reduce((a: number, s: any) => a + (Number(s.weight) || 0), 0) / sizesArr.length) : 0;
    const weightText = variantWeight ? `${variantWeight.toFixed(2)}g (approx)` : avgW ? `${avgW.toFixed(2)}g (approx)` : '32.89g (approx)';

    const sizeValues = sizesArr.map((s: any) => Number(s.size));
    const minSz = sizeValues.length ? Math.min(...sizeValues).toFixed(1) : '5.0';
    const maxSz = sizeValues.length ? Math.max(...sizeValues).toFixed(1) : '11.0';
    const sizeText = sizeValues.length <= 1 ? `${minSz}"` : `${minSz}" - ${maxSz}"`;

    return `
      <div style="page-break-inside: avoid; break-inside: avoid; text-align: center; background: #ffffff; padding: 4px;">
        <div style="width: 100%; height: 200px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
          <img src="${zoomUrl}" alt="${tagLabelCode}" style="width: 100%; height: 100%; object-fit: cover; object-position: center;" crossorigin="anonymous" />
        </div>
        <div style="font-size: 13px; font-weight: 900; color: #1d4ed8; text-transform: uppercase; margin-bottom: 4px; line-height: 1.25;">${titleText}</div>
        <div style="font-size: 10px; color: #111827; font-weight: 700; line-height: 1.45;">
          <strong>Tag Label:</strong> ${tagLabelCode}<br />
          <strong>Weight:</strong> ${weightText}<br />
          <strong>Size:</strong> ${sizeText}<br />
          <strong>Touch:</strong> ${purity}%
        </div>
      </div>
    `;
  }).join('');

  const safeFileName = `SR_CHAINS_${title.replace(/[^a-zA-Z0-9_\-]/g, '_')}_Catalog.pdf`;

  // Temporary container element offscreen
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '800px';
  container.style.backgroundColor = '#ffffff';
  container.style.padding = '16px';
  container.style.color = '#111827';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  container.innerHTML = `
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

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px 16px;">
      ${cardsHtml}
    </div>
  `;

  document.body.appendChild(container);

  // Pre-load all images before PDF capture
  const images = container.querySelectorAll('img');
  const promises = Array.from(images).map(img => {
    return new Promise((res) => {
      if (img.complete) res(true);
      else {
        img.onload = () => res(true);
        img.onerror = () => res(true);
      }
    });
  });

  const opt: any = {
    margin: [6, 8, 6, 8],
    filename: safeFileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  Promise.all(promises).then(() => {
    html2pdf().set(opt).from(container).save().then(() => {
      if (document.body.contains(container)) document.body.removeChild(container);
    }).catch((err: any) => {
      console.error('PDF Generation Error:', err);
      if (document.body.contains(container)) document.body.removeChild(container);
    });
  });
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
