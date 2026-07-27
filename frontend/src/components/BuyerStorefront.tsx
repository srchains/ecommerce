import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Folder,
  Search,
  ArrowRight,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle,
  Info,
  Heart,
  ShoppingBag,
  Download
} from 'lucide-react';
import { downloadCatalogPDFForCollection } from '../utils/catalogPdfGenerator';

interface BuyerStorefrontProps {
  onSelectProduct: (code: string, variantId?: number, sizeId?: number) => void;
  selectedCollectionFilter?: string | null;
  onClearCollectionFilter?: () => void;
  onOpenCart?: () => void;
}

export const BuyerStorefront: React.FC<BuyerStorefrontProps> = ({ 
  onSelectProduct,
  selectedCollectionFilter,
  onClearCollectionFilter,
}) => {
  const { designs, categories, livePrice, calculatePriceBreakdown, fetchDesigns, fetchCategories, addToWishlist, removeFromWishlist, isInWishlist, cart, addToCart, addMultipleToCart, updateCartQuantity, removeFromCart } = useApp();

  const [selectedCatIds, setSelectedCatIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [babySizesOnly, setBabySizesOnly] = useState(false);
  const [purityFilter, setPurityFilter] = useState('All');
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [stockFilter, setStockFilter] = useState<'all' | 'stock' | 'mto'>('all');
  // Inline Size Dropdown Panel state (expands inside product card)
  const [inlineAddDesignId, setInlineAddDesignId] = useState<number | null>(null);
  const [inlineVariantId, setInlineVariantId] = useState<number | null>(null);
  const [inlineSizeQuantities, setInlineSizeQuantities] = useState<Record<number, number>>({});

  // Mobile Filter Drawer state
  const [isMobileFilterDrawerOpen, setIsMobileFilterDrawerOpen] = useState(false);

  // Track which root categories are expanded in the sidebar
  const [expandedRoots, setExpandedRoots] = useState<Set<number>>(new Set());

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    };
    window.addEventListener('resize', handleResize);
    fetchCategories();
    fetchDesigns('');
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close floating size popover when clicking anywhere outside catalog card
  useEffect(() => {
    if (inlineAddDesignId === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.catalog-card')) {
        setInlineAddDesignId(null);
        setInlineSizeQuantities({});
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inlineAddDesignId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCatIds, searchQuery, babySizesOnly, purityFilter, minPrice, maxPrice, selectedCollectionFilter, stockFilter]);

  const rootCategories = categories.filter(c => c.parent_id === null).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  const getChildren = (parentId: number) => categories.filter(c => c.parent_id === parentId).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

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

  // Toggle category checkbox selection
  const toggleCategorySelect = (catId: number) => {
    setSelectedCatIds(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
        const cat = categories.find(c => c.id === catId);
        if (cat?.parent_id) {
          setExpandedRoots(e => new Set([...e, cat.parent_id!]));
        }
      }
      return next;
    });
  };

  const handleSelectCat = (catId: number | null) => {
    if (catId === null) {
      setSelectedCatIds(new Set());
    } else {
      toggleCategorySelect(catId);
    }
  };

  // Helper: Quick add to cart (single piece or custom quantity)
  const handleQuickAddToCart = (e: React.MouseEvent | null, design: any, variantId?: number, sizeId?: number, quantityToPass: number = 1) => {
    if (e) e.stopPropagation();
    const variant = (variantId ? design.variants?.find((v: any) => v.id === variantId) : null) || design.variants?.[0];
    if (!variant) return;
    const sizeObj = (sizeId ? variant.sizes?.find((s: any) => s.id === sizeId) : null) || variant.sizes?.[0];
    if (!sizeObj) return;

    const itemBreakdown = calculatePriceBreakdown(
      sizeObj.weight,
      design.purity,
      design.wastage_percent,
      design.making_charge_per_gram
    );

    for (let i = 0; i < quantityToPass; i++) {
      const totalAvailableReady = Math.max(0, (sizeObj.stock_available || 0) - (sizeObj.stock_reserved || 0));
      
      // Check how many ready_stock pieces are already in cart for this variant & size
      const currentReadyInCart = cart
        .filter(item => item.variant?.id === variant.id && item.size?.id === sizeObj.id && item.orderType === 'ready_stock')
        .reduce((sum, item) => sum + item.quantity, 0);

      // Smart Allocation Rule: 1st fill available ready stock, then fill Make to Order (MTO)
      const orderType = currentReadyInCart < totalAvailableReady ? 'ready_stock' : 'make_order';

      addToCart({
        design,
        variant,
        size: sizeObj,
        quantity: 1,
        orderType,
        lockedPrice: itemBreakdown.total,
        lockedSilverRate: livePrice?.silver_gram_rate || 222.00,
        lockedEffectiveWeight: itemBreakdown.effectiveWeight,
        lockedBasePrice: itemBreakdown.basePrice,
        lockedMakingCharges: itemBreakdown.makingCharges,
        lockedGst: itemBreakdown.gst
      });
    }
  };

  // Helper: Get current total quantity of a specific variant & size in cart
  const getCartItemQuantity = (variantId?: number, sizeId?: number): number => {
    if (!variantId || !sizeId) return 0;
    return cart
      .filter(item => item.variant?.id === variantId && item.size?.id === sizeId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // Helper: Decrement quantity or remove from cart (removes MTO first, then Ready Stock)
  const handleDecrementQuantity = (e: React.MouseEvent, variantId?: number, sizeId?: number) => {
    e.stopPropagation();
    if (!variantId || !sizeId) return;
    let cartIdx = cart.findIndex(item => item.variant?.id === variantId && item.size?.id === sizeId && item.orderType === 'make_order');
    if (cartIdx === -1) {
      cartIdx = cart.findIndex(item => item.variant?.id === variantId && item.size?.id === sizeId && item.orderType === 'ready_stock');
    }
    if (cartIdx > -1) {
      const currentQty = cart[cartIdx].quantity;
      if (currentQty > 1) {
        updateCartQuantity(cartIdx, currentQty - 1);
      } else {
        removeFromCart(cartIdx);
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

  // Base filtered designs without stock filter applied (to calculate stock filter pill counts)
  const baseFilteredDesigns = useMemo(() => {
    return designs.filter(design => {
      if (design.status !== 'Active') return false;

      const searchMatch = getDesignSearchMatch(design, searchQuery);
      if (!searchMatch.matches) return false;

      let matchesCategory = true;
      if (selectedCatIds.size > 0) {
        const allowedIds = new Set<number>();
        selectedCatIds.forEach(catId => {
          getAllowedCatIds(catId).forEach(id => allowedIds.add(id));
        });
        matchesCategory = allowedIds.has(design.category_id || -1);
      }

      let matchesCollection = true;
      if (selectedCollectionFilter) {
        const target = selectedCollectionFilter.toLowerCase();
        matchesCollection = Boolean(
          (design.collection && design.collection.toLowerCase().includes(target)) ||
          (design.name && design.name.toLowerCase().includes(target)) ||
          (design.design_code && design.design_code.toLowerCase().includes(target))
        );
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
  }, [designs, searchQuery, selectedCatIds, selectedCollectionFilter, purityFilter, babySizesOnly, minPrice, maxPrice]);

  // Helper: Calculate total ready stock pieces available for a design
  const getDesignReadyStockPcs = (design: any): number => {
    return (design.variants || []).reduce((acc: number, v: any) => {
      return acc + (v.sizes || []).reduce((sAcc: number, s: any) => {
        if (s.status !== 'Active') return sAcc;
        return sAcc + Math.max(0, (s.stock_available || 0) - (s.stock_reserved || 0));
      }, 0);
    }, 0);
  };

  const allCount = baseFilteredDesigns.length;

  const stockCount = useMemo(() => {
    return baseFilteredDesigns.filter(design => getDesignReadyStockPcs(design) > 0).length;
  }, [baseFilteredDesigns]);

  const mtoCount = useMemo(() => {
    return baseFilteredDesigns.filter(design => getDesignReadyStockPcs(design) === 0).length;
  }, [baseFilteredDesigns]);

  const filteredDesigns = useMemo(() => {
    return baseFilteredDesigns.filter(design => {
      const readyStock = getDesignReadyStockPcs(design);
      if (stockFilter === 'stock') {
        return readyStock > 0;
      } else if (stockFilter === 'mto') {
        return readyStock === 0;
      }
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }, [baseFilteredDesigns, stockFilter]);

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedCatIds.size > 0 ||
    selectedCollectionFilter ||
    purityFilter !== 'All' ||
    minPrice !== null ||
    maxPrice !== null ||
    babySizesOnly ||
    stockFilter !== 'all'
  );

  // Count designs per category (including children)
  const countForCat = (catId: number) => {
    const ids = getAllowedCatIds(catId);
    return designs.filter(d => d.status === 'Active' && ids.includes(d.category_id || -1)).length;
  };

  // Paginate list
  const ITEMS_PER_PAGE = 10;
  
  // Detect if this is a child-variant-only search (no mother fields matched)
  const isChildOnlySearch = searchQuery.trim() !== '' && filteredDesigns.length > 0 &&
    filteredDesigns.every(design => {
      const sm = getDesignSearchMatch(design, searchQuery);
      return !sm.matchedMother && sm.matchedVariants.length > 0;
    });

  // Calculate child matches if child-only search, otherwise use filtered designs
  const childMatches = useMemo(() => {
    if (!isChildOnlySearch) return [];
    return filteredDesigns.flatMap(design => {
      const searchMatch = getDesignSearchMatch(design, searchQuery);
      return searchMatch.matchedVariants.map((matchedV: any) => ({
        design,
        matchedV
      }));
    });
  }, [filteredDesigns, isChildOnlySearch, searchQuery]);

  const totalItemsCount = isChildOnlySearch ? childMatches.length : filteredDesigns.length;
  const totalPages = Math.ceil(totalItemsCount / ITEMS_PER_PAGE);

  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;

  const paginatedChildMatches = isMobile && totalPages > 1
    ? childMatches.slice(startIdx, endIdx)
    : childMatches;

  const paginatedDesigns = isMobile && totalPages > 1
    ? filteredDesigns.slice(startIdx, endIdx)
    : filteredDesigns;

  // Helper: Render sidebar refinement content (shared between desktop aside & mobile drawer)
  const renderRefinementSidebar = () => (
    <>
      {/* Catalog Groups Section */}
      <div>
        <h3 className="font-bold text-gray-900 text-sm mb-2.5 tracking-tight">Catalog Groups</h3>
        <div className="space-y-0.5">          {/* All Collections */}
          <button
            type="button"
            onClick={() => {
              setSelectedCatIds(new Set());
              setIsMobileFilterDrawerOpen(false);
            }}
            className={`w-full text-left flex items-center justify-between py-1.5 px-2 rounded-md text-xs transition-colors cursor-pointer ${
              selectedCatIds.size === 0
                ? 'font-bold text-gray-900 bg-amber-50/80 text-amber-900 border-l-3 border-amber-600 pl-2'
                : 'text-gray-800 hover:text-amber-700 font-medium'
            }`}
          >
            <span>All Collections</span>
            <span className="text-gray-400 font-mono text-[11px]">
              ({designs.filter(d => d.status === 'Active').length})
            </span>
          </button>

          {/* Root categories with Checkboxes */}
          {(() => {
            const activeRootCats = rootCategories.filter(cat => countForCat(cat.id) > 0);
            const visibleRootCats = activeRootCats;

            return (
              <>
                {visibleRootCats.map((cat) => {
                  const isChecked = selectedCatIds.has(cat.id);
                  const count = countForCat(cat.id);
                  const children = getChildren(cat.id);
                  const hasChildren = children.length > 0;
                  const isExpanded = expandedRoots.has(cat.id);

                  return (
                    <div key={cat.id}>
                      <div className={`flex items-center justify-between py-1 px-1.5 rounded-md transition-colors ${isChecked ? 'bg-amber-50/80 font-bold border-l-3 border-amber-600' : 'hover:bg-gray-50'}`}>
                        <label className="flex items-center gap-2 flex-1 text-left text-xs truncate cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCategorySelect(cat.id)}
                            className="h-3.5 w-3.5 accent-amber-600 rounded shrink-0 cursor-pointer"
                          />
                          <span className={`truncate ${isChecked ? 'font-bold text-amber-900' : 'text-gray-700 hover:text-amber-700 font-medium'}`}>
                            {cat.name}
                          </span>
                        </label>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-gray-400 font-mono text-[11px]">({count})</span>
                          {hasChildren && (
                            <button
                              type="button"
                              onClick={() => toggleRoot(cat.id)}
                              className="p-0.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Sub-categories with Checkboxes */}
                      {hasChildren && isExpanded && (
                        <div className="ml-5 border-l border-gray-200 pl-2 space-y-0.5 my-1">
                          {children.map((child) => {
                            const childChecked = selectedCatIds.has(child.id);
                            const childCount = countForCat(child.id);
                            return (
                              <label
                                key={child.id}
                                className={`w-full flex items-center justify-between py-1 px-1.5 text-[11px] rounded transition-colors cursor-pointer select-none ${
                                  childChecked
                                    ? 'font-bold text-amber-900 bg-amber-50'
                                    : 'text-gray-600 hover:text-amber-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <input
                                    type="checkbox"
                                    checked={childChecked}
                                    onChange={() => toggleCategorySelect(child.id)}
                                    className="h-3 w-3 accent-amber-600 rounded shrink-0 cursor-pointer"
                                  />
                                  <span className="truncate">{child.name}</span>
                                </div>
                                <span className="text-gray-400 font-mono">({childCount})</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>
      </div>



      {/* Active Filters Summary */}
      {(selectedCatIds.size > 0 || minPrice !== null || maxPrice !== null) && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-gray-900 text-xs">Active Filters</span>
            <button
              type="button"
              onClick={() => {
                setSelectedCatIds(new Set());
                setMinPrice(null);
                setMaxPrice(null);
              }}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {Array.from(selectedCatIds).map(catId => {
              const catObj = categories.find(c => c.id === catId);
              if (!catObj) return null;
              return (
                <span key={catId} className="bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  {catObj.name}
                  <button type="button" onClick={() => toggleCategorySelect(catId)} className="hover:text-red-600 cursor-pointer">×</button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">

      {/* ── Desktop Sidebar: Amazon-Style Refinement Panel ── */}
      <aside className="hidden lg:block w-56 shrink-0 bg-white border border-gray-200 rounded-xl p-4 sticky top-0 self-start z-10 space-y-5 shadow-2xs">
        {renderRefinementSidebar()}
      </aside>

      {/* ── Mobile Filter Drawer Toggle Button ── */}
      <div className="lg:hidden w-full mb-1">
        <button
          type="button"
          onClick={() => setIsMobileFilterDrawerOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 text-white rounded-xl font-extrabold text-xs shadow-sm cursor-pointer hover:bg-slate-800 transition-all"
        >
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-amber-400" />
            <span>Catalog Groups & Filters</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-slate-800 text-amber-300 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold">
              {selectedCatIds.size > 0 ? `${selectedCatIds.size} Selected` : 'All Collections'}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-300" />
          </div>
        </button>
      </div>

      {/* ── Mobile Filter Drawer Modal ── */}
      {isMobileFilterDrawerOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs z-50 flex justify-start lg:hidden">
          <div
            className="fixed inset-0"
            onClick={() => setIsMobileFilterDrawerOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-white h-full overflow-y-auto p-4 shadow-2xl space-y-5 z-10 animate-in slide-in-from-left duration-200 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 font-extrabold text-gray-900 text-sm">
                  <Folder className="h-4.5 w-4.5 text-amber-600" />
                  <span>Catalog Groups & Filters</span>
                </div>
                <button
                  onClick={() => setIsMobileFilterDrawerOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded-full cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {renderRefinementSidebar()}
            </div>

            <div className="pt-3 border-t border-gray-100 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={() => setIsMobileFilterDrawerOpen(false)}
                className="w-full py-3 bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
              >
                View Results ({totalItemsCount} Products)
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div className="table-toolbar flex flex-wrap items-center justify-between gap-3">
          {/* Left section: Search bar (Expanded full width) */}
          <div className="flex-1 min-w-[260px] max-w-xl">
            <div className="search-field w-full relative">
              <input
                type="text"
                placeholder="Search design code, name, variant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pr-8 w-full py-2.5 text-sm"
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
          </div>

          {/* Right section: Stock Product & Make to Order Availability Filter */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-xl border border-gray-200 shrink-0 shadow-xs">
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                stockFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>All</span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${stockFilter === 'all' ? 'bg-gray-200 text-gray-800' : 'bg-gray-200/60 text-gray-600'}`}>
                {allCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('stock')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                stockFilter === 'stock'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-emerald-700 hover:bg-white/60'
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${stockFilter === 'stock' ? 'bg-white' : 'bg-emerald-500'}`} />
              <span>Stock Product</span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${stockFilter === 'stock' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                {stockCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('mto')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                stockFilter === 'mto'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-amber-700 hover:bg-white/60'
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${stockFilter === 'mto' ? 'bg-white' : 'bg-amber-500'}`} />
              <span>Make to Order</span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${stockFilter === 'mto' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {mtoCount}
              </span>
            </button>
          </div>
        </div>

        {/* Results count */}
        {(selectedCatIds.size > 0 || searchQuery || minPrice !== null || maxPrice !== null || stockFilter !== 'all') && (() => {
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
              {selectedCatIds.size > 0 && (
                <span>in <span className="font-semibold text-gray-700">
                  {Array.from(selectedCatIds).map(id => categories.find(c => c.id === id)?.name).filter(Boolean).join(', ')}
                </span></span>
              )}
            </div>
          );
        })()}

        {/* Product Grid */}
        {filteredDesigns.length > 0 ? (
          isChildOnlySearch ? (
            // Render detailed child variant cards in a single-column layout
            <div className="space-y-4">
              {paginatedChildMatches.map(({ design, matchedV }) => {
                const catName = categories.find(c => c.id === design.category_id)?.name;
                const purityStr = design.purity === 92.5 || design.purity === 925 ? 'Silver 925' : `${design.purity}% Silver`;
                const allSizes: any[] = matchedV.sizes || [];
                const firstSize = allSizes[0];
                const lastSize = allSizes[allSizes.length - 1];
                    // Price range across all sizes
                    const priceObjs = allSizes.map((s: any) =>
                      calculatePriceBreakdown(s.weight, design.purity, design.wastage_percent, design.making_charge_per_gram)
                    );
                    const minPriceVal = priceObjs.length ? Math.min(...priceObjs.map(p => p.total)) : null;
                    const maxPriceVal = priceObjs.length ? Math.max(...priceObjs.map(p => p.total)) : null;

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
                        onClick={() => onSelectProduct(design.name, matchedV.id, firstSize?.id)}
                      >
                        {/* Image */}
                        <div className="relative sm:w-56 shrink-0 aspect-video sm:aspect-auto bg-gray-100 overflow-hidden">
                          <img
                            src={variantImage}
                            alt={matchedV.variant_name || design.name}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800';
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow">
                            Child Variant Match
                          </span>
                          
                          <span className="absolute top-2 right-2 bg-white/90 border border-gray-200 text-[10px] font-bold text-gray-700 uppercase px-2 py-1 rounded">
                            {design.collection || 'New Arrival'}
                          </span>

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
                              {(() => {
                                const totalReadyStockPcs = (matchedV.sizes || []).reduce((sAcc: number, s: any) => {
                                  if (s.status !== 'Active') return sAcc;
                                  return sAcc + Math.max(0, (s.stock_available || 0) - (s.stock_reserved || 0));
                                }, 0);
                                return totalReadyStockPcs > 0 ? (
                                  <span className="badge-success shrink-0">
                                    In Stock ({totalReadyStockPcs} pcs)
                                  </span>
                                ) : (
                                  <span className="badge-warning shrink-0">
                                    Make to Order
                                  </span>
                                );
                              })()}
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
                                      onClick={(e) => handleQuickAddToCart(e, design, matchedV.id, sz.id)}
                                      className="flex items-center justify-between px-3 py-2 hover:bg-emerald-50/60 transition-all cursor-pointer group/sz"
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
                                        {(() => {
                                          const itemQty = getCartItemQuantity(matchedV.id, sz.id);
                                          return itemQty > 0 ? (
                                            <div
                                              onClick={(e) => e.stopPropagation()}
                                              className="flex items-center gap-1 bg-amber-50 border border-amber-300 rounded-lg p-0.5 shadow-2xs"
                                            >
                                              <button
                                                type="button"
                                                onClick={(e) => handleDecrementQuantity(e, matchedV.id, sz.id)}
                                                className="h-6 w-6 flex items-center justify-center bg-white text-amber-900 border border-amber-200 rounded font-bold text-xs hover:bg-amber-100 cursor-pointer transition-colors"
                                                title="Decrease quantity"
                                              >
                                                −
                                              </button>
                                              <span className="font-mono font-extrabold text-amber-950 text-xs px-1.5 min-w-[18px] text-center">
                                                {itemQty}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={(e) => handleQuickAddToCart(e, design, matchedV.id, sz.id)}
                                                className="h-6 w-6 flex items-center justify-center bg-amber-600 text-white rounded font-bold text-xs hover:bg-amber-700 cursor-pointer transition-colors"
                                                title="Increase quantity"
                                              >
                                                +
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={(e) => handleQuickAddToCart(e, design, matchedV.id, sz.id)}
                                              className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-2xs transition-colors cursor-pointer"
                                            >
                                              + Add
                                            </button>
                                          );
                                        })()}
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
                                onSelectProduct(design.name, matchedV.id, firstSize?.id);
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
              })}

              {/* Search Tip */}
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-3 text-sm text-gray-600">
                <Info className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-700 mb-0.5">Search Tip</p>
                  <p>You searched for child variant <strong className="text-gray-900">"{searchQuery.trim()}"</strong>. Showing exact matching child variant{totalItemsCount !== 1 ? 's' : ''}.</p>
                </div>
              </div>
            </div>
          ) : (
            // Default grid layout for mother/mixed searches
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedDesigns.map((design) => {
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

              const defaultVariant = design.variants.find(v => v.id === targetVariantId) || design.variants[0];
              const catName = categories.find(c => c.id === design.category_id)?.name;

              return (
                <div
                  key={design.id}
                  className={`catalog-card group relative ${inlineAddDesignId === design.id ? 'z-50 !overflow-visible border-slate-900 shadow-2xl' : 'z-1'}`}
                >
                  <div
                    className="aspect-video bg-gray-100 relative overflow-hidden border-b border-gray-200 cursor-pointer rounded-t-[11px]"
                    onClick={() => onSelectProduct(design.name, targetVariantId, targetSizeId)}
                  >
                    <img
                      src={
                        defaultVariant?.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                        design.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                        design.variants?.find((v: any) => v.media?.some((m: any) => m.file_type.startsWith('image')))
                          ?.media?.find((m: any) => m.file_type.startsWith('image'))?.url ||
                        'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800'
                      }
                      alt={design.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800';
                      }}
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

                    {/* Wishlist Heart Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isInWishlist(design.id)) {
                          removeFromWishlist(design.id);
                        } else {
                          addToWishlist(design, design.variants?.[0]?.id);
                        }
                      }}
                      className="absolute top-3 left-3 h-8 w-8 flex items-center justify-center rounded-full bg-white/90 border border-gray-200 shadow-sm hover:scale-110 transition-all cursor-pointer"
                      title={isInWishlist(design.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Heart className={`h-4 w-4 transition-colors ${isInWishlist(design.id) ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'}`} />
                    </button>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">

                      {(() => {
                        const totalReadyStockPcs = getDesignReadyStockPcs(design);
                        return (
                          <div className="flex justify-between items-center gap-2">
                            {/* Left: design code */}
                            <span className="text-xs text-gray-500 font-mono tracking-wide font-semibold">{design.design_code}</span>

                            {/* Right: badge only */}
                            {totalReadyStockPcs > 0 ? (
                              <span className="badge-success whitespace-nowrap shrink-0">
                                In Stock ({totalReadyStockPcs} pcs)
                              </span>
                            ) : (
                              <span className="badge-warning whitespace-nowrap shrink-0">
                                Make to Order
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      {/* Product name — full width, click to navigate */}
                      <h3
                        className="text-lg font-bold text-gray-900 leading-snug cursor-pointer hover:text-amber-700 transition-colors"
                        onClick={() => onSelectProduct(design.name, targetVariantId, targetSizeId)}
                      >
                        {design.name}
                      </h3>

                      {/* Weight info + Add Cart button + View button */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                          <span>⚖ {design.weight_range || '18.5 - 24.3g'}</span>
                          <span>• {design.variants.length} variant{design.variants.length !== 1 ? 's' : ''}</span>
                          <span>• {design.metal}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (inlineAddDesignId === design.id) {
                                setInlineAddDesignId(null);
                                setInlineSizeQuantities({});
                              } else {
                                setInlineAddDesignId(design.id);
                                setInlineVariantId(design.variants?.[0]?.id || null);
                                setInlineSizeQuantities({});
                              }
                            }}
                            className={`font-bold text-[11px] px-3 py-1.5 rounded-lg border cursor-pointer transition-all flex items-center gap-1 shadow-sm ${
                              inlineAddDesignId === design.id
                                ? 'bg-amber-600 border-amber-600 text-white'
                                : 'bg-slate-900 hover:bg-slate-700 active:bg-slate-950 text-white border-slate-800'
                            }`}
                          >
                            <ShoppingBag className="h-3 w-3" />
                            {inlineAddDesignId === design.id ? 'Close' : 'Add Cart'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectProduct(design.name, targetVariantId, targetSizeId)}
                            className="text-gray-600 hover:text-slate-900 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors px-2 py-1"
                          >
                            <span>View</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Filter Match Summary Badges */}
                      {matchedVariantBadgeName && (
                        <div className="pt-1 flex flex-wrap gap-1.5">
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded">
                            Child Variant Matched: {matchedVariantBadgeName}
                          </span>
                        </div>
                      )}

                      {/* ── Floating Dropdown Size Panel (Floats ON TOP of cards below) ── */}
                      {inlineAddDesignId === design.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 right-0 sm:left-1/2 sm:-translate-x-1/2 sm:w-[460px] md:w-[500px] lg:w-[540px] top-full mt-1.5 z-50 bg-white border-2 border-slate-900 shadow-2xl rounded-2xl p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-900 max-h-[75vh] overflow-y-auto"
                        >
                          <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                            <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                              <ShoppingBag className="h-4 w-4 text-amber-600" />
                              Select Sizes & Edit Quantities
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setInlineAddDesignId(null);
                                setInlineSizeQuantities({});
                              }}
                              className="text-gray-400 hover:text-gray-700 p-1 rounded-full cursor-pointer hover:bg-gray-100 transition-colors"
                            >
                              <X className="h-4.5 w-4.5" />
                            </button>
                          </div>

                          {/* Variant finishes if multiple */}
                          {design.variants?.length > 1 && (
                            <div className="flex flex-wrap gap-1.5">
                              {design.variants.map((v: any) => (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => {
                                    setInlineVariantId(v.id);
                                    setInlineSizeQuantities({});
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                    (inlineVariantId || design.variants[0]?.id) === v.id
                                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                      : 'bg-white text-gray-700 border-gray-200 hover:border-slate-300'
                                  }`}
                                >
                                  {v.variant_name || v.variant_code}
                                </button>
                              ))}
                            </div>
                          )}

                          {(() => {
                            const currentVar = design.variants?.find((v: any) => v.id === (inlineVariantId || design.variants[0]?.id)) || design.variants?.[0];
                            const sizes: any[] = currentVar?.sizes || [];
                            return (
                              <div className="space-y-3">
                                {/* Size Pills Grid (5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5...) */}
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-1.5 sm:gap-2">
                                  {sizes.map((sz: any) => {
                                    const qty = inlineSizeQuantities[sz.id] || 0;
                                    const isSelected = qty > 0;
                                    const readyPcs = Math.max(0, (sz.stock_available || 0) - (sz.stock_reserved || 0));

                                    return (
                                      <div
                                        key={sz.id}
                                        onClick={() => {
                                          // Add 1 piece directly to cart immediately
                                          const breakdown = calculatePriceBreakdown(
                                            sz.weight, design.purity, design.wastage_percent, design.making_charge_per_gram
                                          );
                                          const orderType = readyPcs > 0 ? 'ready_stock' : 'make_order';
                                          addToCart({
                                            design,
                                            variant: currentVar,
                                            size: sz,
                                            quantity: 1,
                                            orderType,
                                            lockedPrice: breakdown.total,
                                            lockedSilverRate: livePrice?.silver_gram_rate || 222.00,
                                            lockedEffectiveWeight: breakdown.effectiveWeight,
                                            lockedBasePrice: breakdown.basePrice,
                                            lockedMakingCharges: breakdown.makingCharges,
                                            lockedGst: breakdown.gst
                                          });
                                          setInlineSizeQuantities(prev => ({
                                            ...prev,
                                            [sz.id]: (prev[sz.id] || 0) + 1
                                          }));
                                        }}
                                        className={`relative p-2 sm:p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
                                          isSelected
                                            ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-105'
                                            : readyPcs > 0
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100 hover:border-emerald-400'
                                            : 'bg-white border-gray-200 text-gray-800 hover:border-slate-400'
                                        }`}
                                      >
                                        {isSelected && (
                                          <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 text-[10px] font-extrabold h-4.5 w-4.5 rounded-full flex items-center justify-center shadow-xs border border-white">
                                            {qty}
                                          </span>
                                        )}
                                        <span className="text-xs sm:text-sm font-mono font-extrabold">
                                          {Number(sz.size).toFixed(1)}"
                                        </span>
                                        <span className={`text-[9px] font-bold ${isSelected ? 'text-slate-300' : readyPcs > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                                          {readyPcs > 0 ? `${readyPcs} stock` : 'MTO'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Active Configured Sizes Breakdown with Editable Quantity Input */}
                                {Object.keys(inlineSizeQuantities).length > 0 && (
                                  <div className="space-y-2 pt-2.5 border-t border-slate-200">
                                    <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                                      Edit Quantities:
                                    </span>
                                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                                      {Object.entries(inlineSizeQuantities).map(([szIdStr, qty]) => {
                                        const szId = Number(szIdStr);
                                        const sz = sizes.find(s => s.id === szId);
                                        if (!sz || qty <= 0) return null;

                                        return (
                                          <div key={szId} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs sm:text-sm shadow-2xs">
                                            <span className="font-mono font-bold text-slate-900">
                                              Size {Number(sz.size).toFixed(2)}"
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                // Decrement directly in cart
                                                if (qty <= 1) {
                                                  // Remove last piece from cart
                                                  removeFromCart(szId);
                                                  setInlineSizeQuantities(prev => {
                                                    const copy = { ...prev };
                                                    delete copy[szId];
                                                    return copy;
                                                  });
                                                } else {
                                                  // Decrement 1 from cart
                                                  const existingIdx = cart.findIndex(item =>
                                                    item.size?.id === szId &&
                                                    item.variant?.id === (inlineVariantId || design.variants[0]?.id)
                                                  );
                                                  if (existingIdx !== -1) {
                                                    updateCartQuantity(existingIdx, cart[existingIdx].quantity - 1);
                                                  }
                                                  setInlineSizeQuantities(prev => ({ ...prev, [szId]: qty - 1 }));
                                                }
                                              }}
                                                className="h-6 sm:h-7 w-6 sm:w-7 flex items-center justify-center bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-lg text-sm cursor-pointer transition-colors"
                                              >
                                                −
                                              </button>
                                              <input
                                                type="number"
                                                min="0"
                                                value={qty}
                                                onChange={(e) => {
                                                  const val = parseInt(e.target.value, 10);
                                                  setInlineSizeQuantities(prev => {
                                                    const copy = { ...prev };
                                                    if (isNaN(val) || val <= 0) delete copy[szId];
                                                    else copy[szId] = val;
                                                    return copy;
                                                  });
                                                }}
                                                className="w-12 h-6 sm:h-7 text-center font-mono font-extrabold text-slate-900 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:border-slate-900 focus:outline-none"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => {
                                                // Add 1 more to cart directly
                                                const szObj = sizes.find((s: any) => s.id === szId);
                                                if (szObj) {
                                                  const breakdown = calculatePriceBreakdown(
                                                    szObj.weight, design.purity, design.wastage_percent, design.making_charge_per_gram
                                                  );
                                                  const rPcs = Math.max(0, (szObj.stock_available || 0) - (szObj.stock_reserved || 0));
                                                  addToCart({
                                                    design, variant: currentVar, size: szObj,
                                                    quantity: 1,
                                                    orderType: rPcs > 0 ? 'ready_stock' : 'make_order',
                                                    lockedPrice: breakdown.total,
                                                    lockedSilverRate: livePrice?.silver_gram_rate || 222.00,
                                                    lockedEffectiveWeight: breakdown.effectiveWeight,
                                                    lockedBasePrice: breakdown.basePrice,
                                                    lockedMakingCharges: breakdown.makingCharges,
                                                    lockedGst: breakdown.gst
                                                  });
                                                }
                                                setInlineSizeQuantities(prev => ({ ...prev, [szId]: qty + 1 }));
                                              }}
                                                className="h-6 sm:h-7 w-6 sm:w-7 flex items-center justify-center bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-lg text-sm cursor-pointer transition-colors"
                                              >
                                                +
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                // Remove this size from cart entirely
                                                removeFromCart(szId);
                                                setInlineSizeQuantities(prev => {
                                                  const copy = { ...prev };
                                                  delete copy[szId];
                                                  return copy;
                                                });
                                              }}
                                                className="text-gray-400 hover:text-red-600 ml-1 text-sm cursor-pointer font-bold px-1"
                                              >
                                                ×
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Confirm & Add to Cart Button */}
                                <button
                                  type="button"
                                  disabled={Object.keys(inlineSizeQuantities).length === 0}
                                  onClick={() => {
                                    const currentVarObj = currentVar;
                                    const itemsToAdd: any[] = [];

                                    Object.entries(inlineSizeQuantities).forEach(([szIdStr, qty]) => {
                                      const szId = Number(szIdStr);
                                      const szObj = currentVarObj?.sizes?.find((s: any) => s.id === szId);
                                      if (!szObj || qty <= 0) return;

                                      const totalAvailableReady = Math.max(0, (szObj.stock_available || 0) - (szObj.stock_reserved || 0));
                                      const currentReadyInCart = cart
                                        .filter(item => item.variant?.id === currentVarObj?.id && item.size?.id === szObj.id && item.orderType === 'ready_stock')
                                        .reduce((sum, item) => sum + item.quantity, 0);

                                      const remainingReadyAvailable = Math.max(0, totalAvailableReady - currentReadyInCart);
                                      const readyQty = Math.min(qty, remainingReadyAvailable);
                                      const mtoQty = qty - readyQty;

                                      const breakdown = calculatePriceBreakdown(
                                        szObj.weight,
                                        design.purity,
                                        design.wastage_percent,
                                        design.making_charge_per_gram
                                      );

                                      if (readyQty > 0) {
                                        itemsToAdd.push({
                                          design,
                                          variant: currentVarObj,
                                          size: szObj,
                                          quantity: readyQty,
                                          orderType: 'ready_stock',
                                          lockedPrice: breakdown.total,
                                          lockedSilverRate: livePrice?.silver_gram_rate || 222.00,
                                          lockedEffectiveWeight: breakdown.effectiveWeight,
                                          lockedBasePrice: breakdown.basePrice,
                                          lockedMakingCharges: breakdown.makingCharges,
                                          lockedGst: breakdown.gst
                                        });
                                      }

                                      if (mtoQty > 0) {
                                        itemsToAdd.push({
                                          design,
                                          variant: currentVarObj,
                                          size: szObj,
                                          quantity: mtoQty,
                                          orderType: 'make_order',
                                          lockedPrice: breakdown.total,
                                          lockedSilverRate: livePrice?.silver_gram_rate || 222.00,
                                          lockedEffectiveWeight: breakdown.effectiveWeight,
                                          lockedBasePrice: breakdown.basePrice,
                                          lockedMakingCharges: breakdown.makingCharges,
                                          lockedGst: breakdown.gst
                                        });
                                      }
                                    });

                                    if (itemsToAdd.length > 0) {
                                      addMultipleToCart(itemsToAdd);
                                    }

                                    setInlineAddDesignId(null);
                                    setInlineSizeQuantities({});
                                  }}
                                  className={`w-full py-3 sm:py-3.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                                    Object.keys(inlineSizeQuantities).length > 0
                                      ? 'bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white cursor-pointer'
                                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  <ShoppingBag className="h-4 w-4" />
                                  {Object.keys(inlineSizeQuantities).length > 0
                                    ? `Added ✓ (${Object.values(inlineSizeQuantities).reduce((a, b) => a + b, 0)} pcs in cart)`
                                    : 'Select at Least One Size'}
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center max-w-lg mx-auto mt-8 shadow-xs">
            {hasActiveFilters || designs.length > 0 ? (
              <>
                <div className="h-14 w-14 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
                  <Search className="h-7 w-7" />
                </div>
                <h4 className="text-xl font-extrabold text-gray-900">
                  No Products Found
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed mt-2">
                  We couldn't find any products matching your search or active filter criteria.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Try adjusting your price range, clearing category filters, or searching with different keywords.
                </p>
                <button
                  type="button"
                  onClick={() => { 
                    setSearchQuery(''); 
                    handleSelectCat(null); 
                    setPurityFilter('All');
                    setMinPrice(null); 
                    setMaxPrice(null); 
                    setBabySizesOnly(false);
                    setStockFilter('all');
                  }}
                  className="mt-6 inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                  <span>Clear All Filters</span>
                </button>
              </>
            ) : (
              <>
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h4 className="text-lg font-extrabold text-gray-900">
                  No Designs Loaded
                </h4>
                <p className="text-sm text-gray-500 leading-relaxed mt-1">
                  Sync the catalog if you just started the backend server.
                </p>
                <button
                  type="button"
                  onClick={() => { fetchCategories(); fetchDesigns(); }}
                  className="mt-5 btn-secondary text-xs px-4 py-2 cursor-pointer font-bold"
                >
                  Sync Catalog
                </button>
              </>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {isMobile && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-6">
            <button
              onClick={() => {
                setCurrentPage(prev => Math.max(prev - 1, 1));
                if (typeof window !== 'undefined') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              disabled={currentPage === 1}
              className={`btn-secondary text-xs px-4 py-2 cursor-pointer ${
                currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Prev
            </button>
            
            <span className="text-xs text-gray-500 font-semibold">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => {
                setCurrentPage(prev => Math.min(prev + 1, totalPages));
                if (typeof window !== 'undefined') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              disabled={currentPage === totalPages}
              className={`btn-secondary text-xs px-4 py-2 cursor-pointer ${
                currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};