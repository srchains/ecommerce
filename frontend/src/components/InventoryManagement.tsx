import React, { useState, useMemo } from 'react';
import { useApp, API_BASE_URL } from '../context/AppContext';
import { 
  Package, 
  Search, 
  Plus, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Download
} from 'lucide-react';
import axios from 'axios';

export const InventoryManagement: React.FC = () => {
  const { designs, fetchDesigns, categories } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSizeId, setEditingSizeId] = useState<number | null>(null);
  const [newStockVal, setNewStockVal] = useState<number>(0);
  const [newReservedVal, setNewReservedVal] = useState<number>(0);
  const [msg, setMsg] = useState('');
  const [expandedDesigns, setExpandedDesigns] = useState<Record<string, boolean>>({});

  const toggleDesignExpand = (designCode: string) => {
    setExpandedDesigns(prev => ({
      ...prev,
      [designCode]: !prev[designCode]
    }));
  };

  // Flattened total SKU count for the metrics badge
  const totalSKUs = useMemo(() => {
    return designs.reduce((acc, design) => {
      return acc + design.variants.reduce((vAcc, variant) => vAcc + variant.sizes.length, 0);
    }, 0);
  }, [designs]);

  // Grouped designs with summary statistics, grouped by design_code (collection group)
  const groupedInventory = useMemo(() => {
    const groupsMap: Record<string, {
      design_code: string;
      collection: string;
      totalPhysicalStock: number;
      totalReserved: number;
      totalAvailable: number;
      totalWeight: number;
      hasLowStock: boolean;
      designs: Array<{
        name: string;
        originalDesign?: any;
        variants: Array<{
          variant_name: string;
          variant_code: string;
          originalVariant?: any;
          variantWeight: number;
          variantPhysicalStock: number;
          variantAvailable: number;
          sizes: Array<{
            size_id: number;
            size: number;
            weight: number;
            stock: number;
            reserved: number;
            available: number;
          }>;
        }>;
      }>;
    }> = {};

    designs.forEach(design => {
      const catId = design.category_id || 0;
      const groupKey = categories.find(c => c.id === catId)?.name || 'Uncategorized';
      
      if (!groupsMap[groupKey]) {
        groupsMap[groupKey] = {
          design_code: groupKey,
          collection: design.collection || 'General',
          totalPhysicalStock: 0,
          totalReserved: 0,
          totalAvailable: 0,
          totalWeight: 0,
          hasLowStock: false,
          designs: []
        };
      }

      const group = groupsMap[groupKey];

      let designPhysicalStock = 0;
      let designReserved = 0;
      let designAvailable = 0;
      let designWeight = 0;
      let designHasLowStock = false;

      const variantsData = design.variants.map(variant => {
        let variantWeight = 0;
        let variantPhysicalStock = 0;
        let variantReserved = 0;
        let variantAvailable = 0;

        const sizesData = variant.sizes.map(size => {
          const reserved = size.stock_reserved || 0;
          const available = Math.max(0, size.stock_available - reserved);
          
          designPhysicalStock += size.stock_available;
          designReserved += reserved;
          designAvailable += available;
          designWeight += size.stock_available * size.weight;
          
          variantWeight += size.stock_available * size.weight;
          variantPhysicalStock += size.stock_available;
          variantReserved += reserved;
          variantAvailable += available;

          if (size.stock_available <= 5) {
            designHasLowStock = true;
          }

          return {
            size_id: size.id,
            size: size.size,
            weight: size.weight,
            stock: size.stock_available,
            reserved,
            available
          };
        });

        return {
          variant_name: variant.variant_name,
          variant_code: variant.variant_code,
          originalVariant: variant,
          variantWeight,
          variantPhysicalStock,
          variantReserved,
          variantAvailable,
          sizes: sizesData
        };
      });

      // Add design to group
      group.designs.push({
        name: design.name, // e.g. RAS-01, RAS-02
        originalDesign: design,
        variants: variantsData
      });

      // Accumulate to group totals
      group.totalPhysicalStock += designPhysicalStock;
      group.totalReserved += designReserved;
      group.totalAvailable += designAvailable;
      group.totalWeight += designWeight;
      if (designHasLowStock) {
        group.hasLowStock = true;
      }
    });

    // Return as array sorted by design_code name
    return Object.values(groupsMap).sort((a, b) => a.design_code.localeCompare(b.design_code));
  }, [designs, categories]);

  // Filter based on search query
  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) return groupedInventory;
    const query = searchQuery.toLowerCase();
    
    return groupedInventory.filter(group => 
      group.design_code.toLowerCase().includes(query) ||
      group.designs.some(d => 
        d.name.toLowerCase().includes(query) ||
        d.variants.some(v => v.variant_name.toLowerCase().includes(query))
      )
    );
  }, [groupedInventory, searchQuery]);

  const handleAdjustClick = (sizeId: number, currentStock: number, currentReserved: number) => {
    setEditingSizeId(sizeId);
    setNewStockVal(currentStock);
    setNewReservedVal(currentReserved);
  };

  const handleSaveStock = async (sizeId: number, originalStock: number, originalReserved: number) => {
    try {
      // 1. Save Physical Stock if changed
      if (newStockVal !== originalStock) {
        await axios.post(`${API_BASE_URL}/api/products/adjust-stock`, {
          variant_size_id: sizeId,
          new_stock: newStockVal
        });
      }
      
      // 2. Save Reserved Stock if changed
      if (newReservedVal !== originalReserved) {
        await axios.post(`${API_BASE_URL}/api/products/adjust-reserved-stock`, {
          variant_size_id: sizeId,
          new_reserved: newReservedVal
        });
      }

      setMsg('Stock and reservations adjusted successfully');
      setEditingSizeId(null);
      fetchDesigns();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Error adjusting stock values');
    }
  };

  // Helper: Find Zoom image ("Z") or fallback to standard image
  const getZoomImageUrl = (design?: any, variant?: any): string => {
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

    // 3. Check all variants of design for Zoom image Z
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

    return 'https://images.unsplash.com/photo-1611591475155-4284fa2893ab?w=500&auto=format&fit=crop&q=80';
  };

  // Helper: Generate printable PDF catalog window with instant 100% image load & clickable product links
  const generateCatalogPDF = (title: string, itemsList: Array<{ design: any; variant: any; sizes?: any[]; variantWeight?: number }>) => {
    if (!itemsList || itemsList.length === 0) {
      alert('No inventory items to export.');
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
                  <div style="font-size: 10px; font-weight: 800; color: #d97706; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">B2B Silver Jewelry</div>
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

  const handleDownloadAllPDF = () => {
    const items: Array<{ design: any; variant: any; sizes?: any[]; variantWeight?: number }> = [];
    filteredInventory.forEach(group => {
      group.designs.forEach(d => {
        d.variants.forEach(v => {
          items.push({
            design: d.originalDesign,
            variant: v.originalVariant,
            sizes: v.sizes,
            variantWeight: v.variantWeight
          });
        });
      });
    });
    generateCatalogPDF('Ready Stock Inventory', items);
  };

  const handleDownloadGroupPDF = (group: any) => {
    const items: Array<{ design: any; variant: any; sizes?: any[]; variantWeight?: number }> = [];
    group.designs.forEach((d: any) => {
      d.variants.forEach((v: any) => {
        items.push({
          design: d.originalDesign,
          variant: v.originalVariant,
          sizes: v.sizes,
          variantWeight: v.variantWeight
        });
      });
    });
    generateCatalogPDF(`${group.design_code} Collection`, items);
  };

  const handleDownloadVariantPDF = (design: any, variant: any, sizes?: any[], variantWeight?: number) => {
    generateCatalogPDF(`${variant?.variant_code || 'Variant'} Tag`, [{
      design,
      variant,
      sizes,
      variantWeight
    }]);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="section-header">
        <div>
          <h2 className="page-title">Ready Stock Inventory</h2>
          <p className="muted-text text-sm mt-2">Manage batch physical inventory and adjustments for silver variants.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge-neutral"><Package className="h-3.5 w-3.5 mr-1 inline" /> {totalSKUs} SKUs</span>
          <button className="btn-secondary">
            <Settings className="h-4 w-4" />
            <span>Adjustment History</span>
          </button>
        </div>
      </div>

      <div className="table-toolbar">
        <div className="search-field">
          <input 
            type="text" 
            placeholder="Search collection, design code or variant..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
          />
          <Search className="h-4 w-4 search-icon" />
        </div>
        <button className="btn-secondary">
          <Plus className="h-4 w-4" />
          <span>Bulk Adjustment</span>
        </button>
        <button className="btn-secondary">
          <TrendingDown className="h-4 w-4" />
          <span>Low Stock Report</span>
        </button>
        <button 
          onClick={handleDownloadAllPDF}
          className="btn-secondary bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
          title="Download PDF Tag Catalog for all items"
        >
          <Download className="h-4 w-4 text-amber-700" />
          <span>Download Catalog PDF</span>
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center space-x-2 font-medium">
          <CheckCircle className="h-4.5 w-4.5" />
          <span>{msg}</span>
        </div>
      )}

      <div className="space-y-4">
        {filteredInventory.map((group, idx) => {
          const isExpanded = !!expandedDesigns[group.design_code] || !!searchQuery;
          
          return (
            <div key={idx} className="enterprise-panel overflow-hidden border border-gray-200 rounded-xl bg-white shadow-sm">
              {/* Mother Row: Collection Group Details (e.g. Rasakulla) */}
              <div 
                onClick={() => toggleDesignExpand(group.design_code)}
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/60 transition-colors select-none"
              >
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-gray-700">
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 font-mono font-semibold uppercase">{group.collection}</span>
                    <h3 className="text-base font-bold text-gray-900 leading-tight mt-0.5">{group.design_code}</h3>
                  </div>
                </div>
                
                <div className="flex items-center space-x-8 text-sm">
                  <div className="hidden sm:block text-right">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Designs</span>
                    <p className="font-mono font-bold text-gray-900 mt-0.5">{group.designs.length}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Total Stock</span>
                    <p className="font-mono font-bold text-gray-900 mt-0.5">{group.totalPhysicalStock} pcs</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Total Weight</span>
                    <p className="font-mono font-bold text-gray-900 mt-0.5">{group.totalWeight.toFixed(2)}g</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Available</span>
                    <p className="font-mono font-bold text-gray-900 mt-0.5 text-green-700">{group.totalAvailable} pcs</p>
                  </div>

                  {group.hasLowStock && (
                    <span className="badge-warning flex items-center text-xs px-2 py-0.5"><AlertTriangle className="h-3.5 w-3.5 mr-1" /> Low Stock</span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadGroupPDF(group);
                    }}
                    className="px-3 py-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ml-2"
                    title="Download PDF Tag Catalog for this collection group"
                  >
                    <Download className="h-3.5 w-3.5 text-amber-700" />
                    <span>PDF Catalog</span>
                  </button>
                </div>
              </div>

              {/* Children Panel: Nested Designs Inside Group */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/30 p-5 space-y-6">
                  {group.designs.map((design, dIdx) => {
                    return (
                      <div key={dIdx} className="space-y-4 border border-gray-200/60 rounded-xl p-4 bg-white shadow-xs">
                        <h4 className="text-sm font-extrabold text-gray-950 border-b border-gray-100 pb-2">
                          Design Code: <span className="text-indigo-600">{design.name}</span>
                        </h4>
                        
                        {design.variants.map((variant, vIdx) => {
                          return (
                            <div key={vIdx} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-bold text-gray-700">
                                  Variant: <span className="text-gray-900">{variant.variant_name}</span> <span className="text-[10px] text-gray-400 font-mono">({variant.variant_code})</span>
                                </h5>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadVariantPDF(design.originalDesign, variant.originalVariant, variant.sizes, variant.variantWeight)}
                                  className="px-2.5 py-1 bg-white border border-gray-200 hover:border-amber-300 hover:bg-amber-50 text-gray-700 hover:text-amber-800 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                  title="Download PDF for this variant"
                                >
                                  <Download className="h-3 w-3 text-amber-600" />
                                  <span>Download PDF</span>
                                </button>
                              </div>
                              <div className="overflow-x-auto border border-gray-100 rounded-lg bg-white">
                                <table className="enterprise-table text-xs">
                                  <thead>
                                    <tr>
                                      <th>Size (Inch)</th>
                                      <th>Weight (Grams)</th>
                                      <th className="text-center">Physical Stock</th>
                                      <th className="text-center">Reserved (Inquiries)</th>
                                      <th className="text-center">Available Stock</th>
                                      <th className="text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {variant.sizes.map((row, sIdx) => {
                                      const isLow = row.stock <= 5;
                                      const isEditing = editingSizeId === row.size_id;

                                      return (
                                        <tr key={sIdx}>
                                          <td className="text-gray-700 font-mono font-medium">{row.size.toFixed(2)}</td>
                                          <td className="text-gray-700 font-mono">{row.weight.toFixed(2)}g</td>
                                          
                                          <td className="text-center">
                                            {isEditing ? (
                                              <div className="flex items-center justify-center space-x-1.5" onClick={e => e.stopPropagation()}>
                                                <input 
                                                  type="number" 
                                                  value={newStockVal}
                                                  onChange={(e) => setNewStockVal(parseInt(e.target.value) || 0)}
                                                  className="input w-16 py-1 text-center text-xs"
                                                  autoFocus
                                                />
                                              </div>
                                            ) : (
                                              <span className={isLow ? 'badge-danger text-[10px] px-2 py-0.5' : 'badge-neutral text-[10px] px-2 py-0.5'}>{row.stock}</span>
                                            )}
                                          </td>

                                          <td className="text-center">
                                            {isEditing ? (
                                              <div className="flex items-center justify-center space-x-1.5" onClick={e => e.stopPropagation()}>
                                                <input 
                                                  type="number" 
                                                  value={newReservedVal}
                                                  onChange={(e) => setNewReservedVal(parseInt(e.target.value) || 0)}
                                                  className="input w-16 py-1 text-center text-xs"
                                                />
                                              </div>
                                            ) : (
                                              <span className="text-gray-500 font-semibold font-mono">{row.reserved}</span>
                                            )}
                                          </td>

                                          <td className="text-center text-gray-900 font-semibold font-mono">
                                            {isEditing ? (
                                              Math.max(0, newStockVal - newReservedVal)
                                            ) : (
                                              row.available
                                            )}
                                          </td>

                                          <td className="text-right" onClick={e => e.stopPropagation()}>
                                            {isEditing ? (
                                              <div className="flex justify-end space-x-2">
                                                <button 
                                                  onClick={() => handleSaveStock(row.size_id, row.stock, row.reserved)}
                                                  className="btn-primary px-2.5 py-1 text-[10px]"
                                                >
                                                  Save
                                                </button>
                                                <button 
                                                  onClick={() => setEditingSizeId(null)}
                                                  className="btn-secondary px-2.5 py-1 text-[10px]"
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            ) : (
                                              <button 
                                                onClick={() => handleAdjustClick(row.size_id, row.stock, row.reserved)}
                                                className="text-gray-900 hover:text-gray-700 font-semibold text-xs cursor-pointer"
                                              >
                                                Adjust Stock
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot className="bg-gray-50/80 font-bold border-t border-gray-200">
                                    <tr>
                                      <td className="text-gray-900">Total</td>
                                      <td className="text-gray-900 font-mono">{variant.variantWeight.toFixed(2)}g</td>
                                      <td className="text-center text-gray-900 font-mono">{variant.variantPhysicalStock} pcs</td>
                                      <td className="text-center text-gray-500 font-mono">{(variant as any).variantReserved} pcs</td>
                                      <td className="text-center text-green-700 font-mono">{variant.variantAvailable} pcs</td>
                                      <td></td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {filteredInventory.length === 0 && (
          <div className="empty-state">No matching design records found.</div>
        )}
      </div>
    </div>
  );
};