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
  ChevronUp,
  FolderOpen,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import axios from 'axios';

export const InventoryManagement: React.FC = () => {
  const { designs, fetchDesigns, categories } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortOption, setSortOption] = useState('code-asc');
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

  // Unique collections for filter list
  const collectionsList = useMemo(() => {
    const set = new Set<string>();
    designs.forEach(d => {
      if (d.collection && d.collection.trim()) {
        set.add(d.collection.trim());
      }
    });
    return Array.from(set);
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
        category_id: design.category_id,
        totalPhysicalStock,
        totalReserved,
        totalAvailable,
        hasLowStock,
        variants: variantsData
      };
    });
  }, [designs]);

  // Filter and Sort inventory items
  const filteredInventory = useMemo(() => {
    let result = [...groupedInventory];

    // Filter by search query matching design code, design name, or variant name
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(design => 
        design.design_code.toLowerCase().includes(query) ||
        design.name.toLowerCase().includes(query) ||
        design.variants.some(v => v.variant_name.toLowerCase().includes(query))
      );
    }

    // Filter by collection
    if (selectedCollection) {
      result = result.filter(design => design.collection.toLowerCase() === selectedCollection.toLowerCase());
    }

    // Filter by category
    if (selectedCategory) {
      result = result.filter(design => design.category_id === parseInt(selectedCategory));
    }

    // Sort designs
    result.sort((a, b) => {
      switch (sortOption) {
        case 'stock-asc':
          return a.totalPhysicalStock - b.totalPhysicalStock;
        case 'stock-desc':
          return b.totalPhysicalStock - a.totalPhysicalStock;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'code-desc':
          return b.design_code.localeCompare(a.design_code);
        case 'code-asc':
        default:
          return a.design_code.localeCompare(b.design_code);
      }
    });

    return result;
  }, [groupedInventory, searchQuery, selectedCollection, selectedCategory, sortOption]);

  // Calculated overall metrics for filtered results
  const stats = useMemo(() => {
    let totalStock = 0;
    let totalAvailable = 0;
    let lowStockCount = 0;
    filteredInventory.forEach(d => {
      totalStock += d.totalPhysicalStock;
      totalAvailable += d.totalAvailable;
      if (d.hasLowStock) {
        lowStockCount++;
      }
    });
    return { totalStock, totalAvailable, lowStockCount };
  }, [filteredInventory]);

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

      {/* Stats Overview Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="enterprise-panel p-5 flex items-center justify-between bg-white border border-gray-200 rounded-xl shadow-2xs">
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Total Physical Stock</span>
            <span className="text-2xl font-black text-gray-900 mt-1 block font-mono">
              {stats.totalStock} <span className="text-xs text-gray-500 font-sans font-medium">pcs</span>
            </span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 shadow-2xs">
            <Package className="h-5 w-5" />
          </div>
        </div>

        <div className="enterprise-panel p-5 flex items-center justify-between bg-white border border-gray-200 rounded-xl shadow-2xs">
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Total Available</span>
            <span className="text-2xl font-black text-green-700 mt-1 block font-mono">
              {stats.totalAvailable} <span className="text-xs text-gray-500 font-sans font-medium">pcs</span>
            </span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600 shadow-2xs">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="enterprise-panel p-5 flex items-center justify-between bg-white border border-gray-200 rounded-xl shadow-2xs">
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Low Stock Alerts</span>
            <span className={`text-2xl font-black mt-1 block font-mono ${stats.lowStockCount > 0 ? 'text-amber-600 animate-pulse' : 'text-gray-900'}`}>
              {stats.lowStockCount} <span className="text-xs text-gray-500 font-sans font-medium">items</span>
            </span>
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shadow-2xs ${stats.lowStockCount > 0 ? 'bg-amber-50 border border-amber-100 text-amber-600' : 'bg-gray-50 border border-gray-100 text-gray-400'}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Advanced Filters Toolbar */}
      <div className="enterprise-panel p-4 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="search-field flex-1">
            <input 
              type="text" 
              placeholder="Search design code, name or variant..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pr-10"
            />
            <Search className="h-4 w-4 search-icon text-gray-400" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Collection Filter */}
            <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <FolderOpen className="h-3.5 w-3.5 text-gray-500" />
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-700 outline-none border-none cursor-pointer"
              >
                <option value="">All Collections</option>
                {collectionsList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <Filter className="h-3.5 w-3.5 text-gray-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-700 outline-none border-none cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Sorting Filter */}
            <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-gray-500" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-700 outline-none border-none cursor-pointer"
              >
                <option value="code-asc">Code: A to Z</option>
                <option value="code-desc">Code: Z to A</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="name-desc">Name: Z to A</option>
                <option value="stock-asc">Stock: Low to High</option>
                <option value="stock-desc">Stock: High to Low</option>
              </select>
            </div>

            {/* Low Stock Quick Filter Toggle */}
            <button
              onClick={() => {
                if (sortOption === 'stock-asc') {
                  setSortOption('code-asc');
                } else {
                  setSortOption('stock-asc');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                sortOption === 'stock-asc'
                  ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-2xs'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Low Stock First</span>
            </button>
          </div>
        </div>
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