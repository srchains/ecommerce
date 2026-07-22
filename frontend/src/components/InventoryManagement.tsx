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
  ChevronUp
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
        variants: Array<{
          variant_name: string;
          variant_code: string;
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
                              <h5 className="text-xs font-bold text-gray-700">
                                Variant: <span className="text-gray-900">{variant.variant_name}</span> <span className="text-[10px] text-gray-400 font-mono">({variant.variant_code})</span>
                              </h5>
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
                                      <td className="text-center text-gray-500 font-mono">{variant.variantReserved} pcs</td>
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