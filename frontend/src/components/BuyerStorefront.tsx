import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Folder,
  FolderOpen,
  Search,
  ArrowRight,
  AlertCircle,
  ChevronRight,
  X,
  CheckCircle,
  Info,
} from 'lucide-react';

interface BuyerStorefrontProps {
  onSelectProduct: (code: string, variantId?: number, sizeId?: number) => void;
  selectedCollectionFilter?: string | null;
  onClearCollectionFilter?: () => void;
}

export const BuyerStorefront: React.FC<BuyerStorefrontProps> = ({ 
  onSelectProduct,
  selectedCollectionFilter,
  onClearCollectionFilter
}) => {
  const { designs, categories, livePrice, calculatePriceBreakdown, fetchDesigns, fetchCategories } = useApp();
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [babySizesOnly, setBabySizesOnly] = useState(false);
  const [purityFilter, setPurityFilter] = useState('All');
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  // Track which root categories are expanded in the sidebar
  const [expandedRoots, setExpandedRoots] = useState<Set<number>>(new Set());

  const rootCategories = categories.filter(c => c.parent_id === null);
  const getChildren = (parentId: number) => categories.filter(c => c.parent_id === parentId);

  const toggleRoot = (catId: number) => {
    setExpandedRoots(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  // When user picks a category: select it and auto-expand its parent if it's a child
  const handleSelectCat = (catId: number | null) => {
    setSelectedCatId(catId);
    if (catId !== null) {
      const cat = categories.find(c => c.id === catId);
      // If this is a child category, expand its parent
      if (cat?.parent_id) {
        setExpandedRoots(prev => new Set([...prev, cat.parent_id!]));
      }
    }
  };

  // Collect all IDs that match the selected category (including children & grandchildren)
  const getAllowedCatIds = (catId: number): number[] => {
    const ids = [catId];
    const children = getChildren(catId);
    children.forEach(child => {
      ids.push(...getAllowedCatIds(child.id));
    });
    return ids;
  };

  // Normalize a string for fuzzy matching: lowercase, strip underscores and spaces
  const normalizeForSearch = (str: string) =>
    str.toLowerCase().replace(/[_\s]/g, '');

  // Helper: Search logic matching Mother (design) or Child (variant/size)
  const getDesignSearchMatch = (design: any, query: string) => {
    const q = query.trim().toLowerCase();
    const qNorm = normalizeForSearch(query);
    if (!q) return { matches: true, matchedMother: true, matchedVariants: [] };

    const matchedMother =
      design.design_code.toLowerCase().includes(q) ||
      design.name.toLowerCase().includes(q) ||
      (design.style && design.style.toLowerCase().includes(q)) ||
      (design.collection && design.collection.toLowerCase().includes(q));

    const matchedVariants = (design.variants || []).filter((v: any) => {
      const nameNorm = v.variant_name ? normalizeForSearch(v.variant_name) : '';
      const codeNorm = v.variant_code ? normalizeForSearch(v.variant_code) : '';
      // Match by normalized (strips underscores/spaces) OR exact substring
      const matchName = nameNorm && (nameNorm.includes(qNorm) || v.variant_name.toLowerCase().includes(q));
      const matchCode = codeNorm && (codeNorm.includes(qNorm) || v.variant_code.toLowerCase().includes(q));
      const matchSize = (v.sizes || []).some((s: any) => s.size.toString().includes(q));
      return matchName || matchCode || matchSize;
    });

    const matches = matchedMother || matchedVariants.length > 0;
    return { matches, matchedMother, matchedVariants };
  };

  // Helper: Baby size details (<8.0" sizes)
  const getBabySizesDetails = (design: any) => {
    const babySizes: number[] = [];
    let targetVariantId: number | undefined;
    let targetSizeId: number | undefined;
    const matchingBabyItems: any[] = [];

    const purityStr = design.purity === 92.5 || design.purity === 925 ? 'Silver 925' : `${design.purity}% Silver`;

    (design.variants || []).forEach((v: any) => {
      (v.sizes || []).forEach((s: any) => {
        if (s.status === 'Active' && s.size < 8.0) {
          if (!babySizes.includes(s.size)) {
            babySizes.push(s.size);
          }
          if (!targetVariantId) {
            targetVariantId = v.id;
            targetSizeId = s.id;
          }
          const priceObj = calculatePriceBreakdown(
            s.weight,
            design.purity,
            design.wastage_percent,
            design.making_charge_per_gram
          );
          matchingBabyItems.push({
            variantId: v.id,
            variantCode: v.variant_code || design.design_code,
            variantName: v.variant_name || '',
            sizeId: s.id,
            size: s.size,
            weight: s.weight,
            price: priceObj.total,
            sku: v.variant_code || design.design_code,
            purity: purityStr
          });
        }
      });
    });

    babySizes.sort((a, b) => a - b);
    matchingBabyItems.sort((a, b) => a.size - b.size);

    return {
      hasBabySizes: babySizes.length > 0,
      babySizes,
      matchingBabyItems,
      targetVariantId,
      targetSizeId
    };
  };

  // Helper: Price Range evaluation across all active sizes of all variants
  const getPriceRangeDetails = (design: any, minP: number | null, maxP: number | null) => {
    let globalMinPrice = Infinity;
    let globalMaxPrice = -Infinity;
    let matchingMinPrice = Infinity;
    let matchingMaxPrice = -Infinity;
    let matchingVariantCount = 0;
    let targetVariantId: number | undefined;
    let targetSizeId: number | undefined;
    const matchingVariantItems: any[] = [];

    const purityStr = design.purity === 92.5 || design.purity === 925 ? 'Silver 925' : `${design.purity}% Silver`;

    (design.variants || []).forEach((v: any) => {
      (v.sizes || []).forEach((s: any) => {
        if (s.status !== 'Active') return;
        const priceObj = calculatePriceBreakdown(
          s.weight,
          design.purity,
          design.wastage_percent,
          design.making_charge_per_gram
        );
        const priceVal = priceObj.total;
        if (priceVal < globalMinPrice) globalMinPrice = priceVal;
        if (priceVal > globalMaxPrice) globalMaxPrice = priceVal;

        const minOk = minP === null || priceVal >= minP;
        const maxOk = maxP === null || priceVal <= maxP;
        if (minOk && maxOk) {
          matchingVariantCount++;
          if (priceVal < matchingMinPrice) matchingMinPrice = priceVal;
          if (priceVal > matchingMaxPrice) matchingMaxPrice = priceVal;
          if (!targetVariantId) {
            targetVariantId = v.id;
            targetSizeId = s.id;
          }
          matchingVariantItems.push({
            variantId: v.id,
            variantCode: v.variant_code || design.design_code,
            variantName: v.variant_name || '',
            sizeId: s.id,
            size: s.size,
            weight: s.weight,
            price: priceVal,
            sku: v.variant_code || design.design_code,
            purity: purityStr
          });
        }
      });
    });

    const hasPriceFilter = minP !== null || maxP !== null;
    const matchesPrice = !hasPriceFilter || matchingVariantCount > 0;

    return {
      matchesPrice,
      hasPriceFilter,
      globalMinPrice: globalMinPrice === Infinity ? 0 : globalMinPrice,
      globalMaxPrice: globalMaxPrice === -Infinity ? 0 : globalMaxPrice,
      matchingMinPrice: matchingMinPrice === Infinity ? 0 : matchingMinPrice,
      matchingMaxPrice: matchingMaxPrice === -Infinity ? 0 : matchingMaxPrice,
      matchingVariantCount,
      matchingVariantItems,
      targetVariantId,
      targetSizeId
    };
  };

  const filteredDesigns = designs.filter(design => {
    if (design.status !== 'Active') return false;

    const searchMatch = getDesignSearchMatch(design, searchQuery);
    if (!searchMatch.matches) return false;

    let matchesCategory = true;
    if (selectedCatId !== null) {
      const allowedIds = getAllowedCatIds(selectedCatId);
      matchesCategory = allowedIds.includes(design.category_id || -1);
    }

    let matchesCollection = true;
    if (selectedCollectionFilter) {
      const target = selectedCollectionFilter.toLowerCase();
      matchesCollection = 
        (design.collection && design.collection.toLowerCase().includes(target)) ||
        (design.name && design.name.toLowerCase().includes(target)) ||
        (design.design_code && design.design_code.toLowerCase().includes(target));
    }

    const matchesPurity = purityFilter === 'All' || design.purity.toString() === purityFilter;

    const babyDetails = getBabySizesDetails(design);
    let matchesBaby = true;
    if (babySizesOnly) {
      matchesBaby = babyDetails.hasBabySizes;
    }

    const priceDetails = getPriceRangeDetails(design, minPrice, maxPrice);

    return matchesCategory && matchesCollection && matchesPurity && matchesBaby && priceDetails.matchesPrice;
  });

  // Count designs per category (including children)
  const countForCat = (catId: number) => {
    const ids = getAllowedCatIds(catId);
    return designs.filter(d => d.status === 'Active' && ids.includes(d.category_id || -1)).length;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">

      {/* ── Sidebar: Catalog Groups ── */}
      <aside className="enterprise-card w-full lg:w-60 shrink-0 p-4 lg:sticky lg:top-0 self-start z-10">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
          Catalog Groups
        </h4>

        <div className="space-y-0.5">
          {/* All Collections */}
          <button
            onClick={() => handleSelectCat(null)}
            className={`w-full text-left flex items-center justify-between py-2 px-3 rounded-lg transition-colors text-sm font-semibold cursor-pointer ${
              selectedCatId === null
                ? 'bg-gray-900 text-white'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span>All Collections</span>
            <span className={`text-xs font-mono ${selectedCatId === null ? 'text-gray-300' : 'text-gray-400'}`}>
              {designs.filter(d => d.status === 'Active').length}
            </span>
          </button>

          {/* Root categories (only show categories that have active designs) */}
          {rootCategories.filter(cat => countForCat(cat.id) > 0).map(cat => {
            const children = getChildren(cat.id);
            const hasChildren = children.length > 0;
            const isExpanded = expandedRoots.has(cat.id);
            const isSelected = selectedCatId === cat.id;
            const count = countForCat(cat.id);

            return (
              <div key={cat.id}>
                {/* Root Category Row */}
                <div className="flex items-center gap-1">
                  {hasChildren && (
                    <button
                      onClick={() => toggleRoot(cat.id)}
                      className="p-1 text-gray-400 hover:text-gray-700 transition-colors rounded cursor-pointer shrink-0"
                    >
                      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleSelectCat(cat.id);
                      if (hasChildren && !isExpanded) toggleRoot(cat.id);
                    }}
                    className={`flex-1 text-left flex items-center justify-between py-2 px-2 rounded-lg transition-colors text-sm cursor-pointer ${
                      !hasChildren ? 'ml-6' : ''
                    } ${
                      isSelected
                        ? 'bg-gray-900 text-white font-semibold'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {hasChildren
                        ? isExpanded
                          ? <FolderOpen className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-gray-300' : 'text-gray-400'}`} />
                          : <Folder className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-gray-300' : 'text-gray-400'}`} />
                        : <span className="h-3.5 w-3.5 shrink-0" />
                      }
                      <span className="truncate">{cat.name}</span>
                    </div>
                    {count > 0 && (
                      <span className={`text-xs font-mono shrink-0 ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                </div>

                {/* Children (shown when expanded) */}
                {hasChildren && isExpanded && (
                  <div className="ml-6 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-2">
                    {children.map(child => {
                      const grandChildren = getChildren(child.id);
                      const hasGrand = grandChildren.length > 0;
                      const childSelected = selectedCatId === child.id;
                      const childCount = countForCat(child.id);
                      const childExpanded = expandedRoots.has(child.id);

                      return (
                        <div key={child.id}>
                          <div className="flex items-center gap-1">
                            {hasGrand && (
                              <button
                                onClick={() => toggleRoot(child.id)}
                                className="p-1 text-gray-400 hover:text-gray-700 transition-colors rounded cursor-pointer shrink-0"
                              >
                                <ChevronRight className={`h-3 w-3 transition-transform ${childExpanded ? 'rotate-90' : ''}`} />
                              </button>
                            )}
                            <button
                              onClick={() => handleSelectCat(child.id)}
                              className={`flex-1 text-left flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors text-xs cursor-pointer ${
                                !hasGrand ? 'ml-5' : ''
                              } ${
                                childSelected
                                  ? 'bg-gray-800 text-white font-semibold'
                                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium'
                              }`}
                            >
                              <span className="truncate">{child.name}</span>
                              {childCount > 0 && (
                                <span className={`text-xs font-mono shrink-0 ${childSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                                  {childCount}
                                </span>
                              )}
                            </button>
                          </div>

                          {/* Grandchildren */}
                          {hasGrand && childExpanded && (
                            <div className="ml-5 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-2">
                              {grandChildren.map(grand => {
                                const grandSelected = selectedCatId === grand.id;
                                const grandCount = countForCat(grand.id);
                                return (
                                  <button
                                    key={grand.id}
                                    onClick={() => handleSelectCat(grand.id)}
                                    className={`w-full text-left flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors text-xs cursor-pointer ${
                                      grandSelected
                                        ? 'bg-gray-800 text-white font-semibold'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                  >
                                    <span className="truncate">{grand.name}</span>
                                    {grandCount > 0 && (
                                      <span className={`text-xs font-mono ${grandSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                                        {grandCount}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Active filter indicator */}
        {selectedCatId !== null && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Filtering by:</span>
              <button
                onClick={() => handleSelectCat(null)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                Clear ×
              </button>
            </div>
            <p className="text-xs font-semibold text-gray-800 mt-1 truncate">
              {categories.find(c => c.id === selectedCatId)?.name}
            </p>
          </div>
        )}
        {/* Price Range Filter */}
        <div className="mt-5 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
            Price Range (₹)
          </h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1 pl-1">Min Price</label>
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice || ''}
                  onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : null)}
                  className="input px-2.5 text-xs h-9"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1 pl-1">Max Price</label>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice || ''}
                  onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
                  className="input px-2.5 text-xs h-9"
                />
              </div>
            </div>
            {(minPrice !== null || maxPrice !== null) && (
              <button
                onClick={() => { setMinPrice(null); setMaxPrice(null); }}
                className="w-full btn-secondary text-xs py-1.5 cursor-pointer font-bold"
              >
                Clear Price Filter
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 space-y-6 min-w-0">



        {/* Collection Filter Active Banner */}
        {selectedCollectionFilter && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 px-4 flex items-center justify-between text-xs text-amber-900 font-medium shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-200/80 px-2 py-0.5 rounded text-amber-800">Collection</span>
              <span>Showing results for <strong className="text-amber-950 font-semibold">"{selectedCollectionFilter}"</strong></span>
            </div>
            {onClearCollectionFilter && (
              <button 
                onClick={onClearCollectionFilter}
                className="text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer ml-4"
              >
                Show All Collections ×
              </button>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="table-toolbar">
          <div className="search-field">
            <input
              type="text"
              placeholder="Search design code, name, variant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pr-8"
            />
            <Search className="h-4 w-4 search-icon" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <label className="flex items-center space-x-2 cursor-pointer select-none text-sm text-gray-600">
            <input
              type="checkbox"
              checked={babySizesOnly}
              onChange={(e) => setBabySizesOnly(e.target.checked)}
              className="h-4 w-4 accent-gray-900"
            />
            <span>Baby Sizes (&lt;8.0&quot; Only)</span>
          </label>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <span className="text-gray-500 font-bold uppercase tracking-wider text-xs">Purity</span>
            <select
              value={purityFilter}
              onChange={(e) => setPurityFilter(e.target.value)}
              className="select sm:w-48"
            >
              <option value="All">All Purities</option>
              <option value="92.5">92.5 Fine Silver</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        {(selectedCatId !== null || searchQuery || minPrice !== null || maxPrice !== null) && (() => {
          const isChildOnlySearch = searchQuery.trim() !== '' && filteredDesigns.length > 0 &&
            filteredDesigns.every(design => {
              const sm = getDesignSearchMatch(design, searchQuery);
              return !sm.matchedMother && sm.matchedVariants.length > 0;
            });
          const totalMatchingChildVariants = isChildOnlySearch
            ? filteredDesigns.reduce((acc, design) => {
                const sm = getDesignSearchMatch(design, searchQuery);
                return acc + sm.matchedVariants.length;
              }, 0)
            : 0;
          return (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {isChildOnlySearch ? (
                <span>Showing <span className="font-bold text-blue-700">{totalMatchingChildVariants}</span> matching child variant{totalMatchingChildVariants !== 1 ? 's' : ''}</span>
              ) : (
                <span>Showing <span className="font-bold text-gray-900">{filteredDesigns.length}</span> design{filteredDesigns.length !== 1 ? 's' : ''}</span>
              )}
              {selectedCatId !== null && (
                <span>in <span className="font-semibold text-gray-700">
                  {categories.find(c => c.id === selectedCatId)?.name}
                </span></span>
              )}
            </div>
          );
        })()}

        {/* Product Grid */}
        {filteredDesigns.length > 0 ? (() => {
          // Detect if this is a child-variant-only search (no mother fields matched)
          const isChildOnlySearch = searchQuery.trim() !== '' &&
            filteredDesigns.every(design => {
              const sm = getDesignSearchMatch(design, searchQuery);
              return !sm.matchedMother && sm.matchedVariants.length > 0;
            });

          if (isChildOnlySearch) {
            // Render detailed child variant cards in a single-column layout
            return (
              <div className="space-y-4">
                {filteredDesigns.map((design) => {
                  const searchMatch = getDesignSearchMatch(design, searchQuery);
                  const catName = categories.find(c => c.id === design.category_id)?.name;
                  const purityStr = design.purity === 92.5 || design.purity === 925 ? 'Silver 925' : `${design.purity}% Silver`;

                  return searchMatch.matchedVariants.map((matchedV: any) => {
                    const allSizes: any[] = matchedV.sizes || [];
                    const firstSize = allSizes[0];
                    const lastSize = allSizes[allSizes.length - 1];
                    // Price range across all sizes
                    const priceObjs = allSizes.map((s: any) =>
                      calculatePriceBreakdown(s.weight, design.purity, design.wastage_percent, design.making_charge_per_gram)
                    );
                    const minPriceVal = priceObjs.length ? Math.min(...priceObjs.map(p => p.total)) : null;
                    const maxPriceVal = priceObjs.length ? Math.max(...priceObjs.map(p => p.total)) : null;

                    const hasBabyInVariant = allSizes.some((s: any) => s.size < 8.0);

                    const variantImage =
                      matchedV.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                      design.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                      design.variants?.find((v: any) => v.media?.some((m: any) => m.file_type.startsWith('image')))
                        ?.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800';

                    return (
                      <div
                        key={`${design.id}-${matchedV.id}`}
                        className="enterprise-card overflow-hidden flex flex-col sm:flex-row group cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => onSelectProduct(design.design_code, matchedV.id, firstSize?.id)}
                      >
                        {/* Image */}
                        <div className="relative sm:w-56 shrink-0 aspect-video sm:aspect-auto bg-gray-100 overflow-hidden">
                          <img
                            src={variantImage}
                            alt={matchedV.variant_name || design.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow">
                            Child Variant Match
                          </span>
                          <span className="absolute top-2 right-2 bg-white/90 border border-gray-200 text-[10px] font-bold text-gray-700 uppercase px-2 py-1 rounded">
                            {design.collection || 'New Arrival'}
                          </span>
                          {hasBabyInVariant && (
                            <span className="absolute bottom-2 right-2 bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                              Baby Sizes Available
                            </span>
                          )}
                          {catName && (
                            <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                              {catName}
                            </span>
                          )}
                          {matchedV.variant_code && (
                            <span className="absolute top-8 left-0 bottom-0 right-0 flex items-end pb-8 px-2 pointer-events-none">
                              <span className="font-mono text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">{matchedV.variant_code}</span>
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                          {/* Header */}
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className="text-[11px] text-gray-500 font-mono font-semibold">{design.design_code}</span>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <h3 className="text-xl font-extrabold text-gray-900 leading-tight">
                                    {matchedV.variant_name || matchedV.variant_code}
                                  </h3>
                                  <span className="bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    Child Variant
                                  </span>
                                </div>
                              </div>
                              <span className="badge-neutral shrink-0">MOQ: {design.moq} pcs</span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1.5">
                              <span>⚖ {design.weight_range || '18.5 - 24.3g'}</span>
                              <span>•</span>
                              <span>{purityStr}</span>
                              <span>•</span>
                              <span>{allSizes.length} size{allSizes.length !== 1 ? 's' : ''} ({firstSize?.size}" – {lastSize?.size}")</span>
                              {catName && <><span>•</span><span>{catName}</span></>}
                            </div>
                          </div>

                          {/* Summary info row */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Purity</p>
                              <p className="text-sm font-extrabold text-gray-900 mt-0.5">{purityStr}</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">SKU</p>
                              <p className="text-sm font-extrabold font-mono text-gray-900 mt-0.5 truncate">{matchedV.variant_code || design.design_code}</p>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Size Range</p>
                              <p className="text-sm font-extrabold text-gray-900 mt-0.5">{firstSize?.size}" – {lastSize?.size}"</p>
                            </div>
                          </div>

                          {/* ALL Sizes table */}
                          {allSizes.length > 0 && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="bg-gray-100 px-3 py-2 flex items-center justify-between">
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-600">Available Sizes &amp; Prices</span>
                                <span className="text-[10px] text-gray-500 font-semibold">{allSizes.length} sizes</span>
                              </div>
                              <div className="max-h-52 overflow-y-auto divide-y divide-gray-100">
                                {allSizes.map((sz: any, idx: number) => {
                                  const priceObj = calculatePriceBreakdown(sz.weight, design.purity, design.wastage_percent, design.making_charge_per_gram);
                                  const isBaby = sz.size < 8.0;
                                  return (
                                    <div
                                      key={sz.id || idx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectProduct(design.design_code, matchedV.id, sz.id);
                                      }}
                                      className="flex items-center justify-between px-3 py-2 hover:bg-blue-50 hover:border-l-2 hover:border-l-blue-500 transition-all cursor-pointer group/sz"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-gray-900 text-sm w-12">{sz.size}"</span>
                                        <span className="text-[10px] text-gray-500">{sz.weight} g</span>
                                        {isBaby && (
                                          <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded">Baby</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="font-mono font-extrabold text-gray-900 text-sm">₹{priceObj.total.toLocaleString('en-IN')}</span>
                                        <span className="text-[9px] text-blue-600 font-bold group-hover/sz:underline">Select →</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Price range + Action */}
                          <div className="flex items-end justify-between pt-1 border-t border-gray-100">
                            <div>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Est. Wholesale Price Range</p>
                              <p className="text-xl font-extrabold font-mono text-gray-900 mt-0.5">
                                {minPriceVal !== null && maxPriceVal !== null
                                  ? minPriceVal === maxPriceVal
                                    ? `₹${minPriceVal.toLocaleString('en-IN')}`
                                    : `₹${minPriceVal.toLocaleString('en-IN')} – ₹${maxPriceVal.toLocaleString('en-IN')}`
                                  : '—'}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectProduct(design.design_code, matchedV.id, firstSize?.id);
                              }}
                              className="btn-primary flex items-center gap-2 text-sm"
                            >
                              <span>View Details</span>
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Matched by label */}
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              Matched by child variant: <span className="font-bold underline underline-offset-2">{searchQuery.trim()}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })}

                {/* Search Tip */}
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-3 text-sm text-gray-600">
                  <Info className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-bold text-gray-700 mb-0.5">Search Tip</p>
                    <p>You searched for child variant <strong className="text-gray-900">"{searchQuery.trim()}"</strong>. Showing exact matching child variant{filteredDesigns.reduce((a, d) => a + getDesignSearchMatch(d, searchQuery).matchedVariants.length, 0) !== 1 ? 's' : ''}.</p>
                  </div>
                </div>
              </div>
            );
          }

          // Default grid layout for mother/mixed searches
          return (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDesigns.map((design) => {
              const searchMatch = getDesignSearchMatch(design, searchQuery);
              const babyDetails = getBabySizesDetails(design);
              const priceDetails = getPriceRangeDetails(design, minPrice, maxPrice);

              // Determine target variant & size for deep linking on click
              let targetVariantId: number | undefined;
              let targetSizeId: number | undefined;
              let matchedVariantBadgeName: string | null = null;

              if (searchQuery.trim() && searchMatch.matchedVariants.length > 0) {
                const matchedV = searchMatch.matchedVariants[0];
                targetVariantId = matchedV.id;
                targetSizeId = matchedV.sizes?.[0]?.id;
                matchedVariantBadgeName = matchedV.variant_name || matchedV.variant_code;
              } else if (babySizesOnly && babyDetails.targetVariantId) {
                targetVariantId = babyDetails.targetVariantId;
                targetSizeId = babyDetails.targetSizeId;
              } else if ((minPrice !== null || maxPrice !== null) && priceDetails.targetVariantId) {
                targetVariantId = priceDetails.targetVariantId;
                targetSizeId = priceDetails.targetSizeId;
              } else {
                targetVariantId = design.variants[0]?.id;
                targetSizeId = design.variants[0]?.sizes[0]?.id;
              }

              // Collect matching variant items to render directly inside card
              let displayVariantItems: any[] = [];
              let filterBadgeLabel = '';
              let filterBadgeBg = '';

              if (babySizesOnly && priceDetails.hasPriceFilter) {
                displayVariantItems = babyDetails.matchingBabyItems.filter(item => {
                  const minOk = minPrice === null || item.price >= minPrice;
                  const maxOk = maxPrice === null || item.price <= maxPrice;
                  return minOk && maxOk;
                });
                filterBadgeLabel = `Baby Sizes (<8.0") & ₹${minPrice || 0} – ₹${maxPrice || '∞'}`;
                filterBadgeBg = 'border-emerald-200 bg-emerald-50/70 text-emerald-950';
              } else if (babySizesOnly) {
                displayVariantItems = babyDetails.matchingBabyItems;
                filterBadgeLabel = 'Available Baby Size Products (<8.0")';
                filterBadgeBg = 'border-emerald-200 bg-emerald-50/70 text-emerald-950';
              } else if (priceDetails.hasPriceFilter) {
                displayVariantItems = priceDetails.matchingVariantItems;
                filterBadgeLabel = `Matching Products (₹${minPrice || 0} – ₹${maxPrice || '∞'})`;
                filterBadgeBg = 'border-amber-200/80 bg-amber-50/70 text-amber-950';
              }

              const defaultVariant = design.variants.find(v => v.id === targetVariantId) || design.variants[0];
              const defaultSize = (targetSizeId ? defaultVariant?.sizes.find(s => s.id === targetSizeId) : null) || defaultVariant?.sizes.find(s => s.size === 8.0) || defaultVariant?.sizes[0];
              const weight = defaultSize ? defaultSize.weight : 20.0;
              const price = calculatePriceBreakdown(weight, design.purity, design.wastage_percent, design.making_charge_per_gram);

              const catName = categories.find(c => c.id === design.category_id)?.name;

              return (
                <div
                  key={design.id}
                  onClick={() => onSelectProduct(design.design_code, targetVariantId, targetSizeId)}
                  className="catalog-card group cursor-pointer"
                >
                  <div className="aspect-video bg-gray-100 relative overflow-hidden border-b border-gray-200">
                    <img
                      src={
                        defaultVariant?.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                        design.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                        design.variants?.find((v: any) => v.media?.some((m: any) => m.file_type.startsWith('image')))
                          ?.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                        'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800'
                      }
                      alt={design.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Collection Tag */}
                    <span className="absolute top-3 right-3 bg-white/90 border border-gray-200 px-2.5 py-1 rounded-md text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      {design.collection || 'New'}
                    </span>

                    {/* Category Tag */}
                    {catName && (
                      <span className="absolute bottom-3 left-3 bg-black/60 text-white text-[10px] font-semibold px-2.5 py-1 rounded-md backdrop-blur-xs">
                        {catName}
                      </span>
                    )}

                    {/* Matched Variant Badge (if child searched) */}
                    {matchedVariantBadgeName && (
                      <span className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-md animate-pulse">
                        Variant: {matchedVariantBadgeName}
                      </span>
                    )}

                    {/* Baby Sizes Available Tag */}
                    {babyDetails.hasBabySizes && !babySizesOnly && (
                      <span className="absolute bottom-3 right-3 bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                        Baby Sizes ({babyDetails.babySizes.map(s => `${s}"`).join(', ')})
                      </span>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-xs text-gray-500 font-mono tracking-wide font-semibold">{design.design_code}</span>
                        <span className="badge-neutral">MOQ: {design.moq} pcs</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 leading-snug">{design.name}</h3>
                      
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        <span>⚖ {design.weight_range || '18.5 - 24.3g'}</span>
                        <span>• {design.variants.length} variant{design.variants.length !== 1 ? 's' : ''}</span>
                        <span>• {design.metal}</span>
                      </div>

                      {/* Filter Match Summary Badges */}
                      {matchedVariantBadgeName && (
                        <div className="pt-1 flex flex-wrap gap-1.5">
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded">
                            Child Variant Matched: {matchedVariantBadgeName}
                          </span>
                        </div>
                      )}

                      {/* Matching Product Variants List inside ProductDesign Card (Price & Baby Sizes filters) */}
                      {displayVariantItems.length > 0 && (
                        <div className={`mt-3 pt-3 border-t -mx-5 px-5 py-3 space-y-2 ${filterBadgeBg}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider">
                              {filterBadgeLabel} ({displayVariantItems.length})
                            </span>
                          </div>

                          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                            {displayVariantItems.map((item: any, idx: number) => (
                              <div
                                key={`${item.variantId}-${item.sizeId}-${idx}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectProduct(design.design_code, item.variantId, item.sizeId);
                                }}
                                className="bg-white border border-gray-200 rounded-lg p-2.5 flex items-center justify-between text-xs hover:border-emerald-500 hover:shadow-xs transition-all cursor-pointer group/item"
                              >
                                <div className="space-y-0.5 min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5 flex-wrap font-semibold text-gray-900">
                                    <span className="text-emerald-800 font-bold">Size: {item.size}&quot;</span>
                                    <span className="text-gray-300">•</span>
                                    <span>Weight: {item.weight}g</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 truncate">
                                    {item.sku && <span>SKU: <strong className="font-mono text-gray-700">{item.sku}</strong></span>}
                                    {item.sku && item.purity && <span>•</span>}
                                    {item.purity && <span>{item.purity}</span>}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-mono font-extrabold text-gray-900 text-xs block">
                                    ₹{item.price.toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-[9px] text-blue-600 font-bold group-hover/item:underline">Select →</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-200 pt-4 flex justify-between items-end text-sm">
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                          {priceDetails.hasPriceFilter
                            ? `Price Range (${minPrice ? '₹' + minPrice : 'Min'} - ${maxPrice ? '₹' + maxPrice : 'Max'} Filter)`
                            : priceDetails.globalMinPrice < priceDetails.globalMaxPrice 
                            ? 'Price Range Across Sizes' 
                            : 'Est. Wholesale Price'}
                        </span>
                        <p className="text-gray-900 font-extrabold font-mono text-lg mt-0.5">
                          {priceDetails.hasPriceFilter ? (
                            priceDetails.matchingMinPrice < priceDetails.matchingMaxPrice ? (
                              <>
                                ₹{priceDetails.matchingMinPrice.toLocaleString('en-IN')} - ₹{priceDetails.matchingMaxPrice.toLocaleString('en-IN')}
                              </>
                            ) : (
                              <>
                                ₹{priceDetails.matchingMinPrice.toLocaleString('en-IN')}{' '}
                                <span className="text-xs font-medium text-gray-500">/ pc*</span>
                              </>
                            )
                          ) : priceDetails.globalMinPrice < priceDetails.globalMaxPrice ? (
                            <>
                              ₹{priceDetails.globalMinPrice.toLocaleString('en-IN')} - ₹{priceDetails.globalMaxPrice.toLocaleString('en-IN')}
                            </>
                          ) : (
                            <>
                              ₹{price.total.toLocaleString('en-IN')}{' '}
                              <span className="text-xs font-medium text-gray-500">/ pc*</span>
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1.5 text-gray-700 font-bold group-hover:text-gray-900 transition-colors">
                        <span>View</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          );
        })() : (
          <div className="empty-state max-w-md mx-auto mt-12">
            <AlertCircle className="h-10 w-10 text-gray-400 mx-auto" />
            <h4 className="text-lg font-bold text-gray-900 mt-3">
              {searchQuery || selectedCatId ? 'No Matching Designs' : 'No Designs Loaded'}
            </h4>
            <p className="text-sm text-gray-500 leading-relaxed mt-2">
              {searchQuery || selectedCatId
                ? 'Try adjusting your filters or search query.'
                : 'Sync the catalog if you just started the backend server.'}
            </p>
            {!searchQuery && !selectedCatId && (
              <button
                onClick={() => { fetchCategories(); fetchDesigns(); }}
                className="mt-4 btn-secondary"
              >
                Sync Catalog
              </button>
            )}
            {(searchQuery || selectedCatId || minPrice !== null || maxPrice !== null) && (
              <button
                onClick={() => { 
                  setSearchQuery(''); 
                  handleSelectCat(null); 
                  setMinPrice(null); 
                  setMaxPrice(null); 
                }}
                className="mt-4 btn-secondary"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
