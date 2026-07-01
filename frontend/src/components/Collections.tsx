import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Layers, 
  FolderOpen, 
  ChevronDown, 
  ChevronUp, 
  Image as ImageIcon, 
  Eye, 
  AlertCircle,
  Search,
  ArrowUpDown
} from 'lucide-react';

export const Collections: React.FC = () => {
  const { designs, setSelectedDesignCode, setAdminTab } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('name-asc');
  const [expandedCollections, setExpandedCollections] = useState<Record<string, boolean>>({});

  // Group designs by their collection and filter/sort them
  const collectionsData = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    designs.forEach(design => {
      const colName = design.collection?.trim() || 'Unassigned Collection';
      if (!groups[colName]) {
        groups[colName] = [];
      }
      groups[colName].push(design);
    });

    let list = Object.keys(groups).map(name => {
      const colDesigns = groups[name];
      let totalVariants = 0;
      let totalStock = 0;
      const thumbnailsSet = new Set<string>();

      colDesigns.forEach(d => {
        totalVariants += d.variants.length;
        
        // Add design-level image
        if (d.media?.[0]?.url) {
          thumbnailsSet.add(d.media[0].url);
        }
        
        d.variants.forEach((v: any) => {
          totalStock += v.sizes.reduce((sum: number, s: any) => sum + s.stock_available, 0);
          if (v.media?.[0]?.url) {
            thumbnailsSet.add(v.media[0].url);
          }
        });
      });

      return {
        name,
        designs: colDesigns,
        totalVariants,
        totalStock,
        thumbnails: Array.from(thumbnailsSet).slice(0, 4) // Show up to 4 thumbnails
      };
    });

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(col => col.name.toLowerCase().includes(q));
    }

    // Sort options
    list.sort((a, b) => {
      // Keep 'Unassigned Collection' at the bottom
      if (a.name === 'Unassigned Collection') return 1;
      if (b.name === 'Unassigned Collection') return -1;

      switch (sortOption) {
        case 'designs-desc':
          return b.designs.length - a.designs.length;
        case 'designs-asc':
          return a.designs.length - b.designs.length;
        case 'stock-desc':
          return b.totalStock - a.totalStock;
        case 'stock-asc':
          return a.totalStock - b.totalStock;
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'name-asc':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return list;
  }, [designs, searchQuery, sortOption]);

  const toggleExpand = (name: string) => {
    setExpandedCollections(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleViewDesign = (designCode: string) => {
    setSelectedDesignCode(designCode);
    setAdminTab('all-designs');
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="section-header">
        <div>
          <h2 className="page-title">Product Collections</h2>
          <p className="muted-text text-sm mt-2">Manage catalogs and track performance analytics grouped by collection categories.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge-neutral">
            <FolderOpen className="h-3.5 w-3.5 mr-1 inline" /> 
            {collectionsData.filter(c => c.name !== 'Unassigned Collection').length} Collections
          </span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="enterprise-panel p-4 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="search-field flex-1">
            <input 
              type="text" 
              placeholder="Search collections by name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pr-10"
            />
            <Search className="h-4 w-4 search-icon text-gray-400" />
          </div>

          <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 shrink-0">
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-500" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-transparent text-xs font-semibold text-gray-700 outline-none border-none cursor-pointer"
            >
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="designs-desc">Designs: High to Low</option>
              <option value="designs-asc">Designs: Low to High</option>
              <option value="stock-desc">Stock: High to Low</option>
              <option value="stock-asc">Stock: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {collectionsData.map((collection) => {
          const isExpanded = !!expandedCollections[collection.name] || !!searchQuery;
          
          return (
            <div 
              key={collection.name} 
              className={`enterprise-panel overflow-hidden border border-gray-200 rounded-xl bg-white shadow-xs transition-all duration-200 ${
                collection.name === 'Unassigned Collection' ? 'border-dashed border-gray-300' : ''
              }`}
            >
              {/* Collection Header Card */}
              <div 
                onClick={() => toggleExpand(collection.name)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 select-none"
              >
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-xl bg-gray-950 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <FolderOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      {collection.name}
                      {collection.name === 'Unassigned Collection' && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded border border-gray-200">
                          Draft/Pending
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      {collection.designs.length} designs • {collection.totalVariants} variants • {collection.totalStock} available pieces
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  {/* Thumbnails preview strip */}
                  <div className="flex -space-x-2.5 overflow-hidden">
                    {collection.thumbnails.map((url, idx) => (
                      <div 
                        key={idx} 
                        className="h-9 w-9 rounded-lg border-2 border-white bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm"
                      >
                        <img 
                          src={url} 
                          alt="thumbnail" 
                          className="h-full w-full object-cover" 
                        />
                      </div>
                    ))}
                    {collection.thumbnails.length === 0 && (
                      <div className="h-9 w-9 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  <div className="text-gray-400">
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>
              </div>

              {/* Nested Designs Table */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50/20">
                  <table className="enterprise-table text-xs">
                    <thead>
                      <tr>
                        <th className="w-16 pl-6">Preview</th>
                        <th>Design Code</th>
                        <th>Design Name</th>
                        <th className="text-center">Variants</th>
                        <th className="text-center">Total Stock</th>
                        <th className="text-right pr-6 w-32">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collection.designs.map((design: any) => {
                        const designStock = design.variants.reduce((sum: number, v: any) => 
                          sum + v.sizes.reduce((sSum: number, s: any) => sSum + s.stock_available, 0), 0
                        );
                        const designThumbnail = design.media?.[0]?.url || design.variants?.[0]?.media?.[0]?.url || '';
                        
                        return (
                          <tr key={design.id}>
                            <td className="pl-6">
                              <div className="h-9 w-9 rounded border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                                {designThumbnail ? (
                                  <img 
                                    src={designThumbnail} 
                                    alt={design.name} 
                                    className="h-full w-full object-cover" 
                                  />
                                ) : (
                                  <ImageIcon className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="font-bold text-gray-900 font-mono">{design.design_code}</span>
                            </td>
                            <td>
                              <span className="font-semibold text-gray-700">{design.name}</span>
                            </td>
                            <td className="text-center font-semibold font-mono">
                              {design.variants.length} finishes
                            </td>
                            <td className="text-center font-bold font-mono">
                              <span className={designStock > 0 ? 'text-gray-900' : 'text-red-500'}>
                                {designStock} pcs
                              </span>
                            </td>
                            <td className="text-right pr-6">
                              <button
                                onClick={() => handleViewDesign(design.design_code)}
                                className="inline-flex items-center gap-1 text-gray-900 hover:text-black font-semibold text-xs py-1 px-2.5 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer select-none transition-all"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Inspect</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {collectionsData.length === 0 && (
          <div className="module-placeholder">
            <div className="mx-auto h-12 w-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 mb-4">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">No Catalog Items found</h4>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">Create products and specify collection values inside design edit configurations.</p>
          </div>
        )}
      </div>
    </div>
  );
};
