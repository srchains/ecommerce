import React, { useState, useMemo } from 'react';
import { useApp, API_BASE_URL } from '../context/AppContext';
import { 
  Layers, 
  Search, 
  ToggleLeft, 
  ToggleRight, 
  ImageIcon, 
  AlertCircle,
  FolderOpen,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import axios from 'axios';

interface FlatVariant {
  id: number;
  variant_code: string;
  variant_name: string;
  status: string;
  parentDesignCode: string;
  parentDesignName: string;
  parentDesignId: number;
  totalStock: number;
  thumbnail: string;
  sizes: any[];
}

export const Variants: React.FC = () => {
  const { designs, fetchDesigns, token } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [expandedDesigns, setExpandedDesigns] = useState<Record<string, boolean>>({});
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Flat list of all variants
  const allVariants = useMemo(() => {
    const list: FlatVariant[] = [];
    designs.forEach(design => {
      design.variants.forEach(variant => {
        list.push({
          ...variant,
          parentDesignCode: design.design_code,
          parentDesignName: design.name,
          parentDesignId: design.id,
          totalStock: variant.sizes.reduce((sum: number, size: any) => sum + size.stock_available, 0),
          thumbnail: variant.media?.[0]?.url || design.media?.[0]?.url || '',
          sizes: variant.sizes
        });
      });
    });
    return list;
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

  // Group variants by parent design SKU
  const groupedVariants = useMemo(() => {
    const map: Record<string, { designCode: string; designName: string; collection: string; variants: FlatVariant[] }> = {};
    
    designs.forEach(design => {
      const designCode = design.design_code;
      const collectionName = design.collection || 'General';
      
      design.variants.forEach(variant => {
        const flatVar: FlatVariant = {
          ...variant,
          parentDesignCode: designCode,
          parentDesignName: design.name,
          parentDesignId: design.id,
          totalStock: variant.sizes.reduce((sum: number, size: any) => sum + size.stock_available, 0),
          thumbnail: variant.media?.[0]?.url || design.media?.[0]?.url || '',
          sizes: variant.sizes
        };
        
        // Filter by Search Query
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery = !query || 
          flatVar.variant_code.toLowerCase().includes(query) ||
          flatVar.variant_name.toLowerCase().includes(query) ||
          flatVar.parentDesignCode.toLowerCase().includes(query) ||
          flatVar.parentDesignName.toLowerCase().includes(query);
          
        // Filter by Status
        const matchesStatus = !selectedStatus || flatVar.status === selectedStatus;
        
        // Filter by Collection
        const matchesCollection = !selectedCollection || collectionName.toLowerCase() === selectedCollection.toLowerCase();
        
        if (matchesQuery && matchesStatus && matchesCollection) {
          if (!map[designCode]) {
            map[designCode] = {
              designCode,
              designName: design.name,
              collection: collectionName,
              variants: []
            };
          }
          map[designCode].variants.push(flatVar);
        }
      });
    });
    
    return Object.values(map).filter(group => group.variants.length > 0);
  }, [designs, searchQuery, selectedStatus, selectedCollection]);

  const toggleDesignExpand = (designCode: string) => {
    setExpandedDesigns(prev => ({
      ...prev,
      [designCode]: !prev[designCode]
    }));
  };

  const handleStatusToggle = async (variantId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      setTogglingId(variantId);
      await axios.put(`${API_BASE_URL}/api/products/variants/${variantId}/status`, 
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchDesigns();
    } catch (err) {
      console.error(err);
      alert('Failed to update variant status');
    } finally {
      setTogglingId(null);
    }
  };

  const totalFilteredFinishes = useMemo(() => {
    return groupedVariants.reduce((sum, group) => sum + group.variants.length, 0);
  }, [groupedVariants]);

  return (
    <div className="space-y-6 pb-12">
      <div className="section-header">
        <div>
          <h2 className="page-title">Catalog Variants Directory</h2>
          <p className="muted-text text-sm mt-2">Manage all jewelry variant finishes, status toggles, and catalog placements.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge-neutral"><Layers className="h-3.5 w-3.5 mr-1 inline" /> {totalFilteredFinishes} Finishes Displayed</span>
        </div>
      </div>

      {/* Advanced Filters Toolbar */}
      <div className="enterprise-panel p-4 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="search-field flex-1">
            <input 
              type="text" 
              placeholder="Search by variant code, name, design code..." 
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

            {/* Status Filter */}
            <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <Filter className="h-3.5 w-3.5 text-gray-500" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-700 outline-none border-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {groupedVariants.length > 0 ? (
        <div className="space-y-4">
          {groupedVariants.map((group) => {
            const isExpanded = !!expandedDesigns[group.designCode] || !!searchQuery;
            
            return (
              <div key={group.designCode} className="enterprise-panel overflow-hidden border border-gray-200 rounded-xl bg-white shadow-xs">
                {/* Parent Design Header Bar */}
                <div 
                  onClick={() => toggleDesignExpand(group.designCode)}
                  className="p-4 bg-gray-50/50 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors select-none border-b border-gray-100"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-gray-700">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 font-mono font-bold uppercase">{group.designCode}</span>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">{group.designName}</h3>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-xs text-gray-500">
                    <div>
                      Collection: <span className="font-semibold text-gray-800">{group.collection}</span>
                    </div>
                    <div className="hidden sm:block">
                      Variants Matching: <span className="font-bold text-gray-900">{group.variants.length}</span>
                    </div>
                  </div>
                </div>

                {/* Variants List for this Design */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="enterprise-table text-xs">
                      <thead>
                        <tr>
                          <th className="w-16 pl-6">Preview</th>
                          <th>Variant Code / Name</th>
                          <th className="text-center">Active Sizes</th>
                          <th className="text-center">Physical Stock</th>
                          <th className="text-center w-24">Status</th>
                          <th className="text-right w-36 pr-6">Toggle Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.variants.map((variant) => (
                          <tr key={variant.id} className={variant.status === 'Inactive' ? 'opacity-65' : ''}>
                            <td className="pl-6">
                              <div className="h-10 w-10 rounded border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                                {variant.thumbnail ? (
                                  <img 
                                    src={variant.thumbnail} 
                                    alt={variant.variant_name} 
                                    className="h-full w-full object-cover" 
                                  />
                                ) : (
                                  <ImageIcon className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="font-bold text-gray-900 font-mono">{variant.variant_code}</div>
                              <div className="text-xs text-gray-500 font-medium">{variant.variant_name}</div>
                            </td>
                            <td className="text-center font-semibold font-mono">
                              {variant.sizes.filter((s: any) => s.status === 'Active').length} / {variant.sizes.length}
                            </td>
                            <td className="text-center font-bold font-mono">
                              <span className={variant.totalStock > 0 ? 'text-gray-900' : 'text-red-500'}>
                                {variant.totalStock} pcs
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                variant.status === 'Active' 
                                  ? 'bg-green-50 text-green-700 border border-green-200' 
                                  : 'bg-gray-100 text-gray-600 border border-gray-300'
                              }`}>
                                {variant.status}
                              </span>
                            </td>
                            <td className="text-right pr-6">
                              <button
                                onClick={() => handleStatusToggle(variant.id, variant.status)}
                                disabled={togglingId === variant.id}
                                className="inline-flex items-center gap-1.5 text-gray-900 hover:text-black font-semibold text-xs py-1.5 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer disabled:opacity-50 select-none transition-all"
                              >
                                {variant.status === 'Active' ? (
                                  <>
                                    <ToggleRight className="h-4 w-4 text-green-600" />
                                    <span>Deactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="h-4 w-4 text-gray-400" />
                                    <span>Activate</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="module-placeholder">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 mb-4">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">No Variants Found</h4>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">Create designs with finishes in the catalogs tab to generate variant codes.</p>
        </div>
      )}
    </div>
  );
};
