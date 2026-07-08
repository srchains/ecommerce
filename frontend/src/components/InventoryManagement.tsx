import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Package, 
  Search, 
  Plus, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import axios from 'axios';

export const InventoryManagement: React.FC = () => {
  const { designs, fetchDesigns } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSizeId, setEditingSizeId] = useState<number | null>(null);
  const [newStockVal, setNewStockVal] = useState<number>(0);
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

  // Grouped designs with summary statistics
  const groupedInventory = useMemo(() => {
    return designs.map(design => {
      let totalPhysicalStock = 0;
      let totalReserved = 0;
      let totalAvailable = 0;
      let hasLowStock = false;

      const variantsData = design.variants.map(variant => {
        const sizesData = variant.sizes.map(size => {
          const reserved = Math.max(0, Math.floor((size.stock_available * 15) / 100));
          const available = Math.max(0, size.stock_available - reserved);
          totalPhysicalStock += size.stock_available;
          totalReserved += reserved;
          totalAvailable += available;
          if (size.stock_available <= 5) {
            hasLowStock = true;
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
          sizes: sizesData
        };
      });

      return {
        design_code: design.design_code,
        name: design.name,
        collection: design.collection || 'General',
        totalPhysicalStock,
        totalReserved,
        totalAvailable,
        hasLowStock,
        variants: variantsData
      };
    });
  }, [designs]);

  // Filter based on search query matching design code, design name, or variant name
  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) return groupedInventory;
    const query = searchQuery.toLowerCase();
    return groupedInventory.filter(design => 
      design.design_code.toLowerCase().includes(query) ||
      design.name.toLowerCase().includes(query) ||
      design.variants.some(v => v.variant_name.toLowerCase().includes(query))
    );
  }, [groupedInventory, searchQuery]);

  const handleAdjustClick = (sizeId: number, currentStock: number) => {
    setEditingSizeId(sizeId);
    setNewStockVal(currentStock);
  };

  const handleSaveStock = async (sizeId: number) => {
    try {
      await axios.post('http://localhost:8000/api/products/adjust-stock', {
        variant_size_id: sizeId,
        new_stock: newStockVal
      });
      setMsg('Stock adjusted successfully');
      setEditingSizeId(null);
      fetchDesigns();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Error adjusting stock');
    }
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
            placeholder="Search design code, name or variant..." 
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
      </div>

      {msg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center space-x-2 font-medium">
          <CheckCircle className="h-4.5 w-4.5" />
          <span>{msg}</span>
        </div>
      )}

      <div className="space-y-4">
        {filteredInventory.map((design, idx) => {
          const isExpanded = !!expandedDesigns[design.design_code] || !!searchQuery;
          
          return (
            <div key={idx} className="enterprise-panel overflow-hidden border border-gray-200 rounded-xl bg-white shadow-sm">
              {/* Mother Row: Product Design Details */}
              <div 
                onClick={() => toggleDesignExpand(design.design_code)}
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/60 transition-colors select-none"
              >
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-gray-700">
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 font-mono font-semibold uppercase">{design.design_code}</span>
                    <h3 className="text-base font-bold text-gray-900 leading-tight mt-0.5">{design.name}</h3>
                  </div>
                </div>
                
                <div className="flex items-center space-x-8 text-sm">
                  <div className="hidden sm:block text-right">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Collection</span>
                    <p className="font-semibold text-gray-800 mt-0.5">{design.collection}</p>
                  </div>
                  
                  <div className="hidden sm:block text-right">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Variants</span>
                    <p className="font-mono font-bold text-gray-900 mt-0.5">{design.variants.length}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Total Stock</span>
                    <p className="font-mono font-bold text-gray-900 mt-0.5">{design.totalPhysicalStock} pcs</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Available</span>
                    <p className="font-mono font-bold text-gray-900 mt-0.5 text-green-700">{design.totalAvailable} pcs</p>
                  </div>

                  {design.hasLowStock && (
                    <span className="badge-warning flex items-center text-xs px-2 py-0.5"><AlertTriangle className="h-3.5 w-3.5 mr-1" /> Low Stock</span>
                  )}
                </div>
              </div>

              {/* Children Panel: Variants & Sizes Table */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/30 p-4">
                  <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
                    <table className="enterprise-table text-xs">
                      <thead>
                        <tr>
                          <th>Variant Finish</th>
                          <th>Size (Inch)</th>
                          <th>Weight (Grams)</th>
                          <th className="text-center">Physical Stock</th>
                          <th className="text-center">Reserved (Inquiries)</th>
                          <th className="text-center">Available Stock</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {design.variants.flatMap((variant, vIdx) => 
                          variant.sizes.map((row, sIdx) => {
                            const isLow = row.stock <= 5;
                            const isEditing = editingSizeId === row.size_id;

                            return (
                              <tr key={`${vIdx}-${sIdx}`}>
                                {sIdx === 0 ? (
                                  <td 
                                    rowSpan={variant.sizes.length} 
                                    className="font-semibold text-gray-900 align-middle border-r border-gray-100 bg-gray-50/10 px-4"
                                    style={{ width: '180px' }}
                                  >
                                    <span className="block text-sm font-semibold">{variant.variant_name}</span>
                                    <span className="block text-[10px] text-gray-500 font-mono mt-0.5">{variant.variant_code}</span>
                                  </td>
                                ) : null}
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

                                <td className="text-center text-gray-500 font-semibold font-mono">{row.reserved}</td>
                                <td className="text-center text-gray-900 font-semibold font-mono">{row.available}</td>

                                <td className="text-right" onClick={e => e.stopPropagation()}>
                                  {isEditing ? (
                                    <div className="flex justify-end space-x-2">
                                      <button 
                                        onClick={() => handleSaveStock(row.size_id)}
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
                                      onClick={() => handleAdjustClick(row.size_id, row.stock)}
                                      className="text-gray-900 hover:text-gray-700 font-semibold text-xs"
                                    >
                                      Adjust Stock
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
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