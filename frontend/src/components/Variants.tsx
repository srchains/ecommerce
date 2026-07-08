import React, { useState, useMemo } from 'react';
import { useApp, API_BASE_URL } from '../context/AppContext';
import { Layers, Search, ToggleLeft, ToggleRight, ImageIcon, AlertCircle } from 'lucide-react';
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
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Flat-map all variants from designs list
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

  // Filter based on search query
  const filteredVariants = useMemo(() => {
    if (!searchQuery.trim()) return allVariants;
    const query = searchQuery.toLowerCase();
    return allVariants.filter(v => 
      v.variant_code.toLowerCase().includes(query) ||
      v.variant_name.toLowerCase().includes(query) ||
      v.parentDesignCode.toLowerCase().includes(query) ||
      v.parentDesignName.toLowerCase().includes(query)
    );
  }, [allVariants, searchQuery]);

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

  return (
    <div className="space-y-6 pb-12">
      <div className="section-header">
        <div>
          <h2 className="page-title">Catalog Variants Directory</h2>
          <p className="muted-text text-sm mt-2">Manage all jewelry variant finishes, status toggles, and catalog placements.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge-neutral"><Layers className="h-3.5 w-3.5 mr-1 inline" /> {allVariants.length} Active Finishes</span>
        </div>
      </div>

      <div className="table-toolbar">
        <div className="search-field">
          <input 
            type="text" 
            placeholder="Search by variant code, name, design code..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
          />
          <Search className="h-4 w-4 search-icon" />
        </div>
      </div>

      {filteredVariants.length > 0 ? (
        <div className="enterprise-panel overflow-hidden">
          <table className="enterprise-table text-sm">
            <thead>
              <tr>
                <th className="w-16">Preview</th>
                <th>Variant Code / Name</th>
                <th>Parent Design SKU</th>
                <th className="text-center">Sizes</th>
                <th className="text-center">Physical Stock</th>
                <th className="text-center w-24">Status</th>
                <th className="text-right w-36">Toggle Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredVariants.map((variant) => (
                <tr key={variant.id} className={variant.status === 'Inactive' ? 'opacity-65' : ''}>
                  <td>
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
                  <td>
                    <div className="font-bold text-gray-900 font-mono">{variant.parentDesignCode}</div>
                    <div className="text-xs text-gray-500 font-medium">{variant.parentDesignName}</div>
                  </td>
                  <td className="text-center font-semibold font-mono">
                    {variant.sizes.filter(s => s.status === 'Active').length} / {variant.sizes.length}
                  </td>
                  <td className="text-center font-bold font-mono">
                    <span className={variant.totalStock > 0 ? 'text-gray-900' : 'text-red-500'}>
                      {variant.totalStock} pcs
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      variant.status === 'Active' 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-gray-100 text-gray-600 border border-gray-300'
                    }`}>
                      {variant.status}
                    </span>
                  </td>
                  <td className="text-right">
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
