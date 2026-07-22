import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { MediaItem } from '../context/AppContext';

import { 
  ArrowLeft, 
  ShoppingBag,
  Check, 
  Play,
  Heart,
  Share2,
  X,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { SizeConfigurator } from './SizeConfigurator';

interface BuyerProductDetailProps {
  designCode: string;
  initialVariantId?: number;
  initialSizeId?: number;
  onBack: () => void;
  onRequireLogin?: () => void;
  onSelectProduct?: (code: string, variantId?: number, sizeId?: number) => void;
}

export const BuyerProductDetail: React.FC<BuyerProductDetailProps> = ({ 
  designCode, 
  initialVariantId,
  initialSizeId,
  onBack,
  onRequireLogin,
  onSelectProduct
}) => {
  const { designs, livePrice, calculatePriceBreakdown, addToCart, addToWishlist, removeFromWishlist, isInWishlist, wishlist, isCustomerAuthenticated } = useApp();

  const design = useMemo(() => {
    if (!designCode) return undefined;
    const cleanCode = designCode.trim().toLowerCase();
    const cleanNorm = cleanCode.replace(/[\s\-_]/g, '');

    // 1. Direct match by name or design_code
    let match = designs.find(d => d.name === designCode || d.design_code === designCode);
    if (match) return match;

    // 2. Case-insensitive / normalized match by design_code or name
    match = designs.find(d => 
      d.design_code?.trim().toLowerCase() === cleanCode ||
      d.name?.trim().toLowerCase() === cleanCode ||
      d.design_code?.trim().toLowerCase().replace(/[\s\-_]/g, '') === cleanNorm ||
      d.name?.trim().toLowerCase().replace(/[\s\-_]/g, '') === cleanNorm
    );
    if (match) return match;

    // 3. Match by child variant code or variant name
    match = designs.find(d => 
      d.variants?.some((v: any) => 
        v.variant_code?.trim().toLowerCase() === cleanCode ||
        v.variant_name?.trim().toLowerCase() === cleanCode ||
        v.variant_code?.trim().toLowerCase().replace(/[\s\-_]/g, '') === cleanNorm
      )
    );
    return match;
  }, [designs, designCode]);

  const [selectedVariantId, setSelectedVariantId] = useState<number>(0);
  const [selectedSizeId, setSelectedSizeId] = useState<number>(0);

  // Sync variant selection when design data arrives or initialVariantId changes
  useEffect(() => {
    if (design?.variants?.length) {
      if (initialVariantId && design.variants.some(v => v.id === initialVariantId)) {
        setSelectedVariantId(initialVariantId);
      } else if (!selectedVariantId || !design.variants.some(v => v.id === selectedVariantId)) {
        setSelectedVariantId(design.variants[0].id);
      }
    }
  }, [design?.id, initialVariantId]);

  const activeVariant = design?.variants?.find(v => v.id === selectedVariantId) || design?.variants?.[0];

  const availableSizes = useMemo(() => {
    return activeVariant?.sizes?.filter(s => s.size >= 5.0 && s.size <= 11.0) || activeVariant?.sizes || [];
  }, [activeVariant]);

  // Sync size selection when activeVariant or initialSizeId changes
  useEffect(() => {
    if (availableSizes.length > 0) {
      if (initialSizeId && availableSizes.some(s => s.id === initialSizeId)) {
        setSelectedSizeId(initialSizeId);
      } else if (!selectedSizeId || !availableSizes.some(s => s.id === selectedSizeId)) {
        setSelectedSizeId(availableSizes[0].id);
      }
    }
  }, [activeVariant?.id, initialSizeId]);

  const activeSize = availableSizes.find(s => s.id === selectedSizeId) || availableSizes[0] || activeVariant?.sizes?.[0];

  const [addedToCartMsg, setAddedToCartMsg] = useState(false);
  const [selectedSizesConfig, setSelectedSizesConfig] = useState<Record<number, { readyStockQty: number; makeOrderQty: number }>>({});
  const [readyStockInput, setReadyStockInput] = useState<number>(0);
  const [makeOrderInput, setMakeOrderInput] = useState<number>(0);

  // Sync inputs when selected size changes or selectedSizesConfig changes
  useEffect(() => {
    if (selectedSizeId) {
      const config = selectedSizesConfig[selectedSizeId];
      setReadyStockInput(config?.readyStockQty || 0);
      setMakeOrderInput(config?.makeOrderQty || 0);
    } else {
      setReadyStockInput(0);
      setMakeOrderInput(0);
    }
  }, [selectedSizeId, selectedSizesConfig]);

  // Sync local inputs when active size or size configurations change
  useEffect(() => {
    if (activeSize) {
      const config = selectedSizesConfig[activeSize.id];
      if (config) {
        setReadyStockInput(config.readyStockQty);
        setMakeOrderInput(config.makeOrderQty);
      } else {
        setReadyStockInput(0);
        setMakeOrderInput(0);
      }
    }
  }, [selectedSizeId]);

  // Helper: Update size quantity directly from size card stepper
  const handleUpdateSizeQty = (sizeId: number, newTotalQty: number) => {
    const sObj = availableSizes.find(s => s.id === sizeId);
    if (!sObj) return;
    const availStock = Math.max(0, sObj.stock_available - (sObj.stock_reserved || 0));
    const validQty = Math.max(0, newTotalQty);
    const rQty = Math.min(validQty, availStock);
    const mQty = Math.max(0, validQty - rQty);

    setSelectedSizesConfig(prev => {
      if (validQty === 0) {
        const copy = { ...prev };
        delete copy[sizeId];
        return copy;
      }
      return {
        ...prev,
        [sizeId]: { readyStockQty: rQty, makeOrderQty: mQty }
      };
    });
  };

  const [activeMediaIdx, setActiveMediaIdx] = useState(0);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: design.name,
          text: `Check out ${design.name} (${design.design_code}) on SR Chains.`,
          url: window.location.href,
        });
      } else {
        const textToShare = `Check out ${design.name} (${design.design_code}):\n${window.location.href}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(textToShare)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (error) {
      console.log('Share failed', error);
    }
  };

  // Keep URL search parameters in sync with selected variant and size
  useEffect(() => {
    if (!designCode) return;
    const params = new URLSearchParams(window.location.search);
    let changed = false;

    if (params.get('design') !== designCode) {
      params.set('design', designCode);
      changed = true;
    }

    if (selectedVariantId) {
      const vStr = String(selectedVariantId);
      if (params.get('variant') !== vStr) {
        params.set('variant', vStr);
        changed = true;
      }
    } else {
      if (params.has('variant')) {
        params.delete('variant');
        changed = true;
      }
    }

    if (selectedSizeId) {
      const sStr = String(selectedSizeId);
      if (params.get('size') !== sStr) {
        params.set('size', sStr);
        changed = true;
      }
    } else {
      if (params.has('size')) {
        params.delete('size');
        changed = true;
      }
    }

    if (changed) {
      window.history.replaceState(null, '', `?${params.toString()}`);
    }
  }, [designCode, selectedVariantId, selectedSizeId]);

  // Sticky header scroll detection & top-scroll reset
  const [showStickyHeader, setShowStickyHeader] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const scrollContainer = document.querySelector('.app-main');
    if (!scrollContainer) return;

    // Reset scroll to top on mount / designCode change
    scrollContainer.scrollTop = 0;
    setShowStickyHeader(true);
    setIsScrolled(false);
    lastScrollY.current = 0;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      
      // Determine if page has been scrolled
      setIsScrolled(currentScrollY > 10);

      // Determine scroll direction & apply threshold
      if (currentScrollY <= 50) {
        setShowStickyHeader(true);
      } else if (currentScrollY > lastScrollY.current + 5) {
        // Scrolling down
        setShowStickyHeader(false);
      } else if (currentScrollY < lastScrollY.current - 5) {
        // Scrolling up
        setShowStickyHeader(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [designCode]);

  // Automatically switch active input mode / handle initial values

  // ── Image Zoom (pure DOM, no React state, works on desktop + mobile) ──
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const touchMovedRef = useRef(false);
  const touchStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container) return;

    // Always read imgRef.current fresh — img may not exist at mount time
    const getPct = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
        y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
      };
    };

    const zoomIn = (clientX: number, clientY: number) => {
      const img = imgRef.current;
      if (!img) return;
      const { x, y } = getPct(clientX, clientY);
      img.style.transformOrigin = `${x}% ${y}%`;
      img.style.transform = 'scale(2.5)';
    };

    const zoomOut = () => {
      const img = imgRef.current;
      if (!img) return;
      img.style.transform = 'scale(1)';
      img.style.transformOrigin = 'center center';
    };

    // ── Desktop Mouse Events ──
    const onMouseMove  = (e: MouseEvent) => zoomIn(e.clientX, e.clientY);
    const onMouseEnter = (e: MouseEvent) => zoomIn(e.clientX, e.clientY);
    const onMouseLeave = () => zoomOut();

    // ── Mobile Touch Events (non-passive so preventDefault works) ──
    const onTouchStart = (e: TouchEvent) => {
      if (!e.touches.length) return;
      const t = e.touches[0];
      touchMovedRef.current = false;
      touchStartRef.current = { x: t.clientX, y: t.clientY };
      zoomIn(t.clientX, t.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!e.touches.length) return;
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - touchStartRef.current.x);
      const dy = Math.abs(t.clientY - touchStartRef.current.y);
      if (dx > 4 || dy > 4) touchMovedRef.current = true;
      zoomIn(t.clientX, t.clientY);
      e.preventDefault(); // blocks page scroll — works because listener is non-passive
    };

    const onTouchEnd = () => zoomOut();

    // ── Click: open lightbox only if not a zoom-drag ──
    // NOTE: click is handled via React onClick prop on the container div
    // (NOT via addEventListener) so that e.stopPropagation() from child
    // buttons (Like, Share) correctly prevents the lightbox from opening.

    container.addEventListener('mousemove',   onMouseMove);
    container.addEventListener('mouseenter',  onMouseEnter);
    container.addEventListener('mouseleave',  onMouseLeave);
    container.addEventListener('touchstart',  onTouchStart,  { passive: false });
    container.addEventListener('touchmove',   onTouchMove,   { passive: false });
    container.addEventListener('touchend',    onTouchEnd);
    container.addEventListener('touchcancel', onTouchEnd);

    return () => {
      container.removeEventListener('mousemove',   onMouseMove);
      container.removeEventListener('mouseenter',  onMouseEnter);
      container.removeEventListener('mouseleave',  onMouseLeave);
      container.removeEventListener('touchstart',  onTouchStart);
      container.removeEventListener('touchmove',   onTouchMove);
      container.removeEventListener('touchend',    onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  // Handler for clicking the image area to open lightbox
  // (used as React onClick so child stopPropagation() works correctly)
  const handleImageContainerClick = () => {
    if (touchMovedRef.current) { touchMovedRef.current = false; return; }
    setIsLightboxOpen(true);
  };

  // Price flash animation state
  const [priceFlash, setPriceFlash] = useState(false);
  const prevPriceRef = useRef<number | null>(null);

  // Countdown to next live rate refresh (5s)
  const [refreshCountdown, setRefreshCountdown] = useState(5);

  const weight = design ? (activeSize ? activeSize.weight : 20.0) : 20.0;
  const priceBreakdown = calculatePriceBreakdown(
    weight,
    design?.purity || 70,
    design?.wastage_percent || 0,
    design?.making_charge_per_gram || 0
  );

  // Calculate selection summary (total weight and price of currently selected configurations)
  const selectionSummary = Object.entries(selectedSizesConfig).reduce((acc, [sizeIdStr, config]) => {
    const sizeId = parseInt(sizeIdStr);
    const sObj = availableSizes.find(s => s.id === sizeId);
    if (!sObj || (config.readyStockQty === 0 && config.makeOrderQty === 0)) return acc;

    const totalQty = config.readyStockQty + config.makeOrderQty;
    const itemWeight = totalQty * sObj.weight;
    const sBreakdown = calculatePriceBreakdown(
      sObj.weight,
      design?.purity || 70,
      design?.wastage_percent || 0,
      design?.making_charge_per_gram || 0
    );
    const itemPrice = totalQty * sBreakdown.total;

    return {
      qty: acc.qty + totalQty,
      weight: acc.weight + itemWeight,
      price: acc.price + itemPrice
    };
  }, { qty: 0, weight: 0, price: 0 });

  // Flash price when livePrice changes or size changes
  useEffect(() => {
    if (prevPriceRef.current !== null && prevPriceRef.current !== priceBreakdown.total) {
      setPriceFlash(true);
      setTimeout(() => setPriceFlash(false), 800);
    }
    prevPriceRef.current = priceBreakdown.total;
  }, [priceBreakdown.total]);

  // Countdown timer synced to 5s live refresh
  useEffect(() => {
    setRefreshCountdown(5);
    const tick = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) return 5;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [livePrice?.last_updated]);

  // Load active variant media
  let mediaList: MediaItem[] = (activeVariant?.media && activeVariant.media.length > 0) ? activeVariant.media : [];
  if (mediaList.length === 0) {
    mediaList = (design?.media && design.media.length > 0) ? design.media : [];
  }
  if (mediaList.length === 0) {
    const firstVarWithMedia = design?.variants?.find(v => v.media && v.media.length > 0);
    if (firstVarWithMedia) {
      mediaList = firstVarWithMedia.media || [];
    }
  }

  // Helper to extract thumbnail URL for a related design
  const getRelatedDesignImage = (item: any) => {
    if (item.media && item.media.length > 0 && item.media[0]?.url) {
      return item.media[0].url;
    }
    if (item.variants && item.variants.length > 0) {
      for (const v of item.variants) {
        if (v.media && v.media.length > 0 && v.media[0]?.url) {
          return v.media[0].url;
        }
      }
    }
    return null;
  };

  // Helper to calculate approximate total price for a related design
  const getRelatedDesignPrice = (item: any) => {
    const w = item.variants?.[0]?.sizes?.[0]?.weight || 20.0;
    const breakdown = calculatePriceBreakdown(
      w,
      item.purity || 70,
      item.wastage_percent || 0,
      item.making_charge_per_gram || 0
    );
    return breakdown.total;
  };

  // Helper to extract collection name (e.g. Bridal, Antique, Battani)
  const getCollectionName = (item: any) => {
    if (!item) return '';
    if (item.collection && item.collection.trim()) return item.collection.trim().toLowerCase();
    if (item.name && item.name.trim()) {
      const parts = item.name.split('-');
      return parts[0].trim().toLowerCase();
    }
    return '';
  };

  // Compute related items: 1st by Collection matching (Bridal, Antique, etc.), 2nd by Price Proximity (nearest price)
  const relatedItems = useMemo(() => {
    if (!design || !designs || designs.length === 0) return [];

    const currentCollection = getCollectionName(design);
    const currentPrice = priceBreakdown.total || getRelatedDesignPrice(design);

    const candidates = designs.filter(d =>
      d.id !== design.id &&
      d.design_code !== design.design_code &&
      d.status !== 'Archived' &&
      d.status !== 'Inactive'
    );

    if (candidates.length === 0) return [];

    const scored = candidates.map(cand => {
      const candCollection = getCollectionName(cand);
      const candPrice = getRelatedDesignPrice(cand);
      
      let collectionTier = 0; // 0: baseline, 1: category match, 2: prefix match, 3: exact collection match
      if (currentCollection && candCollection && currentCollection === candCollection) {
        collectionTier = 3;
      } else {
        const currPrefix = design.design_code ? design.design_code.replace(/[\d\-_]/g, '').toLowerCase() : '';
        const candPrefix = cand.design_code ? cand.design_code.replace(/[\d\-_]/g, '').toLowerCase() : '';
        if (currPrefix && candPrefix && (currPrefix.includes(candPrefix) || candPrefix.includes(currPrefix))) {
          collectionTier = 2;
        } else if (design.category_id && cand.category_id === design.category_id) {
          collectionTier = 1;
        }
      }

      // Price difference (absolute amount in Rupees)
      const priceDifference = Math.abs(candPrice - currentPrice);

      return {
        candidate: cand,
        collectionTier,
        priceDifference,
        candPrice
      };
    });

    // Sort: 
    // 1st Priority: Higher collection tier first (Same Collection > Prefix > Category)
    // 2nd Priority: Closer price difference first (Near price)
    scored.sort((a, b) => {
      if (b.collectionTier !== a.collectionTier) {
        return b.collectionTier - a.collectionTier;
      }
      return a.priceDifference - b.priceDifference;
    });

    return scored.map(s => s.candidate).slice(0, 8);
  }, [design, designs, priceBreakdown.total, calculatePriceBreakdown]);

  // ── Guard: show spinner while API is loading, show not-found if loaded but missing ──
  if (!design) {
    if (designs.length === 0) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-gray-600">Loading product details...</p>
        </div>
      );
    }
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 text-center">
        <p className="text-gray-500 text-sm">Product not found.</p>
        <button onClick={onBack} className="text-gray-900 font-medium hover:underline text-sm">← Go Back to Catalog</button>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!isCustomerAuthenticated) {
      alert("Please login or sign up to add items to your wholesale cart.");
      if (onRequireLogin) onRequireLogin();
      return;
    }

    const configEntries = Object.entries(selectedSizesConfig).filter(([_, conf]) => (conf.readyStockQty + conf.makeOrderQty) > 0);
    if (configEntries.length === 0) {
      alert("Please configure and add at least one size to your selection first.");
      return;
    }

    let totalQty = 0;
    for (const [_, conf] of configEntries) totalQty += conf.readyStockQty + conf.makeOrderQty;

    if (totalQty < design.moq) {
      alert(`Minimum order quantity for this design is ${design.moq} pieces. You have currently selected ${totalQty} pieces.`);
      return;
    }

    let addedCount = 0;
    for (const [sizeIdStr, conf] of configEntries) {
      const sizeId = parseInt(sizeIdStr);
      const sizeObj = availableSizes.find(s => s.id === sizeId);
      if (!sizeObj) continue;

      const itemBreakdown = calculatePriceBreakdown(
        sizeObj.weight,
        design.purity,
        design.wastage_percent,
        design.making_charge_per_gram
      );

      if (conf.readyStockQty > 0) {
        addToCart({
          design, variant: activeVariant!, size: sizeObj,
          quantity: conf.readyStockQty, orderType: 'ready_stock',
          lockedPrice: itemBreakdown.total, lockedSilverRate: livePrice?.silver_gram_rate || 222.00,
          lockedEffectiveWeight: itemBreakdown.effectiveWeight, lockedBasePrice: itemBreakdown.basePrice,
          lockedMakingCharges: itemBreakdown.makingCharges, lockedGst: itemBreakdown.gst
        });
        addedCount++;
      }
      if (conf.makeOrderQty > 0) {
        addToCart({
          design, variant: activeVariant!, size: sizeObj,
          quantity: conf.makeOrderQty, orderType: 'make_order',
          lockedPrice: itemBreakdown.total, lockedSilverRate: livePrice?.silver_gram_rate || 222.00,
          lockedEffectiveWeight: itemBreakdown.effectiveWeight, lockedBasePrice: itemBreakdown.basePrice,
          lockedMakingCharges: itemBreakdown.makingCharges, lockedGst: itemBreakdown.gst
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      setAddedToCartMsg(true);
      setSelectedSizesConfig({});
      setTimeout(() => setAddedToCartMsg(false), 3000);
    }
  };

  const currentMedia = mediaList[activeMediaIdx] || mediaList[0] || null;

  return (
    <div className="space-y-6 pb-2">
      {/* Floating Back to Catalog Button */}
      <button 
        onClick={onBack}
        className={`fixed top-24 left-8 z-40 flex items-center space-x-2 bg-white/95 backdrop-blur-md border border-gray-200 shadow-md px-4 py-2.5 rounded-full text-xs font-bold text-gray-600 hover:text-gray-900 hover:shadow-lg transition-all duration-300 transform cursor-pointer ${
          isScrolled && showStickyHeader ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <ArrowLeft className="h-3.5 w-3.5 text-gray-500" />
        <span>Back to Catalog</span>
      </button>

      {/* Floating Dynamic Selection Summary (Scrolled State) */}
      {selectionSummary.qty > 0 && (
        <div 
          className={`fixed top-24 right-8 z-40 flex items-center space-x-3 bg-white/95 backdrop-blur-md border border-gray-200 shadow-md px-4 py-2.5 rounded-full text-xs font-medium text-indigo-950 hover:shadow-lg transition-all duration-300 transform select-none ${
            isScrolled ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-4 opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div>
            <span className="text-indigo-500 text-[9px] uppercase font-bold block leading-none mb-0.5">Total Weight</span>
            <span className="font-bold font-mono">{selectionSummary.weight.toFixed(2)}g</span>
          </div>
          <div className="h-6 w-px bg-gray-200"></div>
          <div>
            <span className="text-indigo-500 text-[9px] uppercase font-bold block leading-none mb-0.5">Total Price</span>
            <span className="font-bold text-indigo-600 font-mono">₹{selectionSummary.price.toLocaleString('en-IN')} (Approx. Price)</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Catalog</span>
        </button>

        <div className="flex items-center space-x-4">
          {/* Dynamic Selection Summary next to Wishlist */}
          {selectionSummary.qty > 0 && (
            <div className="text-right text-xs shrink-0 select-none bg-indigo-50 border border-indigo-100 rounded-xl px-3.5 py-1.5 flex items-center space-x-3 text-indigo-950 font-medium animate-fadeIn">
              <div>
                <span className="text-indigo-500 text-[10px] uppercase font-bold block leading-none mb-0.5">Total Weight</span>
                <span className="font-bold font-mono">{selectionSummary.weight.toFixed(2)}g</span>
              </div>
              <div className="h-6 w-px bg-indigo-200"></div>
              <div>
                <span className="text-indigo-500 text-[10px] uppercase font-bold block leading-none mb-0.5">Total Price</span>
                <span className="font-bold text-indigo-600 font-mono">₹{selectionSummary.price.toLocaleString('en-IN')} (Approx. Price)</span>
              </div>
            </div>
          )}

          {/* Wishlist button on product detail */}
          <button
            onClick={() => {
              const currentVariantId = selectedVariantId || design.variants[0]?.id;
              if (isInWishlist(design.id, currentVariantId)) {
                removeFromWishlist(design.id, currentVariantId);
              } else {
                addToWishlist(design, currentVariantId);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isInWishlist(design.id, selectedVariantId || design.variants[0]?.id)
                ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                : 'bg-white border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${isInWishlist(design.id, selectedVariantId || design.variants[0]?.id) ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{isInWishlist(design.id, selectedVariantId || design.variants[0]?.id) ? 'Wishlisted' : 'Wishlist'}</span>
          </button>
        </div>
      </div>

      {/* ── Main Product Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-[1500px] mx-auto w-full">
        {/* Left Column: Media Gallery */}
        <div className="space-y-4 lg:sticky lg:top-4 h-fit">
          {/* Main Media viewer */}
          <div className="enterprise-panel overflow-hidden p-4">
            <div
              ref={imageContainerRef}
              onClick={handleImageContainerClick}
              className="image-frame relative overflow-hidden cursor-zoom-in select-none w-full bg-white rounded-xl border border-gray-200"
              style={{ aspectRatio: '16 / 9', touchAction: 'none' }}
            >
              {currentMedia?.file_type?.startsWith('video') ? (
                <video
                  src={currentMedia.url}
                  controls
                  autoPlay
                  muted
                  loop
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  ref={imgRef}
                  src={currentMedia?.url || 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800'}
                  alt={design.name}
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                    userSelect: 'none',
                  }}
                />
              )}

              <div className="absolute top-4 right-4 flex flex-col gap-2" style={{ zIndex: 10 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentVariantId = selectedVariantId || design.variants[0]?.id;
                    if (isInWishlist(design.id, currentVariantId)) {
                      removeFromWishlist(design.id, currentVariantId);
                    } else {
                      addToWishlist(design, currentVariantId);
                    }
                  }}
                  title={isInWishlist(design.id, selectedVariantId || design.variants[0]?.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                  className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 shadow-sm cursor-pointer transition-colors"
                >
                  <Heart className={`h-4.5 w-4.5 transition-colors ${isInWishlist(design.id, selectedVariantId || design.variants[0]?.id) ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'}`} />
                </button>
                
                <button
                  onClick={(e) => { e.stopPropagation(); handleShare(); }}
                  className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 shadow-sm cursor-pointer transition-colors"
                >
                  <Share2 className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Thumbnails Bottom Row */}
          <div className="flex flex-row gap-3 overflow-x-auto pb-2 pt-2 px-1 hide-scrollbar items-center">
            {mediaList.map((med, idx) => (
              <button 
                key={med.id}
                onClick={() => setActiveMediaIdx(idx)}
                className={`thumb aspect-video h-[80px] sm:h-[100px] shrink-0 relative transition-all duration-300 cursor-pointer rounded-lg overflow-hidden ${
                  activeMediaIdx === idx ? 'ring-2 ring-gray-900 scale-105 shadow-md z-10' : 'hover:ring-2 hover:ring-gray-300'
                }`}
              >
                {med.file_type?.startsWith('video') && (
                  <div className="absolute inset-0 bg-gray-900/20 flex items-center justify-center rounded-lg z-10 pointer-events-none">
                    <Play className="h-6 w-6 text-white drop-shadow-md" />
                  </div>
                )}
                {med.file_type?.startsWith('video') ? (
                  <video src={med.url} className="w-full h-full object-cover rounded-lg" preload="metadata" />
                ) : (
                  <img src={med.url} alt="thumb" className="w-full h-full object-cover rounded-lg" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Info & Action */}
        <div className="space-y-6">
          <div className="enterprise-panel p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-bold text-gray-500 tracking-wider uppercase">{design.design_code}</span>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight mt-2">{design.name}</h2>
              </div>
              {(() => {
                const totalVariantReadyStock = (activeVariant?.sizes || []).reduce((acc: number, s: any) => {
                  if (s.status !== 'Active') return acc;
                  return acc + Math.max(0, (s.stock_available || 0) - (s.stock_reserved || 0));
                }, 0);
                return (
                  <span className={`px-4 py-1.5 rounded-full text-sm font-bold border shadow-sm transition-all ${
                    totalVariantReadyStock > 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}>
                    {totalVariantReadyStock > 0 ? `In Stock (${totalVariantReadyStock} pcs)` : 'Make Order'}
                  </span>
                );
              })()}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Metal</p>
                <p className="font-semibold mt-1">{design.metal}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Purity</p>
                <p className="font-semibold mt-1">{design.purity}% Fine</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">MOQ</p>
                <p className="font-semibold mt-1">{design.moq} pcs</p>
              </div>
            </div>
          </div>

          {/* Product Specifications moved to the bottom */}

          <div className="enterprise-panel p-5 space-y-4">
            <div>
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Select Finish / Variant</span>
              <div className="flex flex-wrap gap-2.5 mt-3">
                {design.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVariantId(v.id);
                      setActiveMediaIdx(0); // Reset variant media slide index
                      const nextVariantSizes = v.sizes.filter(s => s.size >= 5.0 && s.size <= 11.0);
                      const matchedSize = nextVariantSizes.find(s => s.size === activeSize?.size);
                      if (matchedSize) {
                        setSelectedSizeId(matchedSize.id);
                      } else if (nextVariantSizes[0]) {
                        setSelectedSizeId(nextVariantSizes[0].id);
                      }
                    }}
                    className={`variant-button ${selectedVariantId === v.id ? 'variant-button-selected' : ''}`}
                  >
                    {v.variant_name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-3">
                <span className="text-gray-500 font-bold uppercase tracking-wider">Select Anklet Size (Inches)</span>
                <span className="text-gray-500">Running Sizes: 5.0" - 11.0"</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-7 gap-2">
                {availableSizes.map((s) => {
                  const isSelected = selectedSizeId === s.id;
                  const availStock = Math.max(0, (s.stock_available || 0) - (s.stock_reserved || 0));
                  const hasStock = availStock > 0;
                  const config = selectedSizesConfig[s.id];
                  const totalConfiguredQty = config ? (config.readyStockQty + config.makeOrderQty) : 0;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedSizeId(s.id);
                        const newQty = totalConfiguredQty + 1;
                        const rQty = Math.min(newQty, availStock);
                        const mQty = Math.max(0, newQty - rQty);
                        setReadyStockInput(rQty);
                        setMakeOrderInput(mQty);
                        setSelectedSizesConfig(prev => ({
                          ...prev,
                          [s.id]: { readyStockQty: rQty, makeOrderQty: mQty }
                        }));
                      }}
                      className={`size-button flex flex-col items-center justify-center text-center relative cursor-pointer py-2 transition-all ${
                        isSelected
                          ? hasStock
                            ? 'bg-emerald-700 text-white border-emerald-800 font-extrabold shadow-md ring-2 ring-emerald-400'
                            : 'size-button-selected'
                          : hasStock
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-extrabold hover:bg-emerald-100/90 shadow-2xs'
                            : ''
                      }`}
                    >
                      <span className="text-sm font-bold font-mono">{s.size.toFixed(2)}</span>
                      {hasStock ? (
                        <span className={`text-[9px] font-bold mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-emerald-700'}`}>
                          {availStock} in stock
                        </span>
                      ) : (
                        <span className={`text-[9px] font-medium mt-0.5 ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
                          MTO
                        </span>
                      )}
                      {totalConfiguredQty > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                          {totalConfiguredQty}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>



          {/* Selected Sizes & Quantities List */}
          {Object.keys(selectedSizesConfig).length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3.5">
              <h5 className="font-bold text-xs text-gray-700 uppercase tracking-wider">Your Selected Configurations</h5>
              <div className="space-y-2.5">
                {Object.entries(selectedSizesConfig).map(([sizeIdStr, config]) => {
                  const sizeId = parseInt(sizeIdStr);
                  const sObj = availableSizes.find(s => s.id === sizeId);
                  if (!sObj || (config.readyStockQty === 0 && config.makeOrderQty === 0)) return null;

                  const totalQty = config.readyStockQty + config.makeOrderQty;
                  const totalW = totalQty * sObj.weight;
                  const sBreakdown = calculatePriceBreakdown(
                    sObj.weight,
                    design.purity,
                    design.wastage_percent,
                    design.making_charge_per_gram
                  );
                  const totalP = totalQty * sBreakdown.total;

                  return (
                    <div key={sizeId} className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <p className="font-bold text-gray-900 text-sm">Size: {sObj.size.toFixed(2)}"</p>
                        <div className="text-gray-500 font-medium space-y-0.5">
                          <p>Weight: {sObj.weight.toFixed(2)}g | Pure: {(totalQty * sObj.weight * (design.purity / 100)).toFixed(3)}g</p>
                          <p>Total Weight: {totalW.toFixed(2)}g</p>
                          <p className="text-indigo-600 font-semibold font-mono">Subtotal (Approx. Price): ₹{totalP.toLocaleString('en-IN')}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 sm:self-center">
                        {/* Ready Stock Count */}
                        {sObj.stock_available - (sObj.stock_reserved || 0) > 0 && (
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">Ready Stock</span>
                            <div className="qty-control min-w-[70px] h-[28px] text-xs">
                              <button 
                                type="button" 
                                onClick={() => {
                                  setSelectedSizesConfig(prev => {
                                    const existing = prev[sizeId];
                                    const newReady = Math.max(0, existing.readyStockQty - 1);
                                    return {
                                      ...prev,
                                      [sizeId]: { ...existing, readyStockQty: newReady }
                                    };
                                  });
                                }}
                              >
                                -
                              </button>
                              <span>{config.readyStockQty}</span>
                              <button 
                                type="button" 
                                onClick={() => {
                                  setSelectedSizesConfig(prev => {
                                    const existing = prev[sizeId];
                                    const availableReady = Math.max(0, sObj.stock_available - (sObj.stock_reserved || 0));
                                    const newReady = Math.min(availableReady, existing.readyStockQty + 1);
                                    return {
                                      ...prev,
                                      [sizeId]: { ...existing, readyStockQty: newReady }
                                    };
                                  });
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}

                        {/* MTO Count */}
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[10px] text-gray-500 font-bold uppercase">Make Order (MTO)</span>
                          <div className="qty-control min-w-[70px] h-[28px] text-xs">
                            <button 
                              type="button" 
                              onClick={() => {
                                  setSelectedSizesConfig(prev => {
                                    const existing = prev[sizeId];
                                    const newMto = Math.max(0, existing.makeOrderQty - 1);
                                    return {
                                      ...prev,
                                      [sizeId]: { ...existing, makeOrderQty: newMto }
                                    };
                                  });
                              }}
                            >
                              -
                            </button>
                            <span>{config.makeOrderQty}</span>
                            <button 
                              type="button" 
                              onClick={() => {
                                  setSelectedSizesConfig(prev => {
                                    const existing = prev[sizeId];
                                    const newMto = existing.makeOrderQty + 1;
                                    return {
                                      ...prev,
                                      [sizeId]: { ...existing, makeOrderQty: newMto }
                                    };
                                  });
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Remove Size Configuration */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSizesConfig(prev => {
                              const next = { ...prev };
                              delete next[sizeId];
                              return next;
                            });
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all self-end cursor-pointer"
                          title="Remove size configuration"
                        >
                          <X className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add to Cart Actions */}
          <div className="enterprise-panel p-5 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <button
                  onClick={handleAddToCart}
                  className="btn-primary w-full cursor-pointer flex items-center justify-center gap-2 py-3"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Add Selected Sizes to Cart</span>
                </button>
              </div>
            </div>

            {addedToCartMsg && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs flex items-center space-x-2 font-medium">
                <Check className="h-4 w-4 shrink-0" />
                <span>Selected sizes successfully added to your checkout cart.</span>
              </div>
            )}
          </div>

          {/* Dynamic B2B Billing Calculator */}
          <div className="bill-panel space-y-4">
            <div className="border-b border-gray-200 pb-3 flex justify-between items-center">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Dynamic B2B Billing Calculator</h4>
              <span className="text-xs text-gray-500">Size Weight: <span className="font-bold text-gray-900 font-mono">{weight.toFixed(2)}g</span></span>
            </div>

            <div className="space-y-0">
              <div className="bill-row">
                <span>Effective Weight (Purity {design.purity}% + Wastage {design.wastage_percent}%)</span>
                <span className="font-mono">{priceBreakdown.effectiveWeight.toFixed(3)}g</span>
              </div>
              <div className="bill-row">
                <span className="flex items-center gap-1.5">
                  Silver Cost
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block"></span>
                    ₹{livePrice?.silver_gram_rate.toFixed(2)}/g
                  </span>
                </span>
                <span className="font-mono">₹{priceBreakdown.basePrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="bill-row">
                <span>Making Charges (₹{design.making_charge_per_gram}/g)</span>
                <span className="font-mono">₹{priceBreakdown.makingCharges.toLocaleString('en-IN')}</span>
              </div>
              <div className="bill-row">
                <span>GST (3%)</span>
                <span className="font-mono">₹{priceBreakdown.gst.toLocaleString('en-IN')}</span>
              </div>
              <div
                className={`bill-total flex justify-between items-center transition-all duration-300 ${
                  priceFlash ? 'bg-amber-50 text-amber-800 rounded-lg px-2 -mx-2' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  Total Price / Piece (Approx. Price)
                  {priceFlash && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full animate-pulse">
                      ↺ Updated
                    </span>
                  )}
                </span>
                <span className="font-mono">₹{priceBreakdown.total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="enterprise-panel p-6">
            <h3 className="card-title mb-4">Product Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <table className="spec-table">
                <tbody>
                  <tr><td>Design Code</td><td className="font-mono">{design.design_code}</td></tr>
                  <tr><td>Metal</td><td>{design.metal}</td></tr>
                  <tr><td>Weight Range</td><td>{design.weight_range}</td></tr>
                  <tr><td>Finishing</td><td>{design.finishing}</td></tr>
                </tbody>
              </table>
              <table className="spec-table">
                <tbody>
                  <tr><td>Occasion</td><td>{design.occasion}</td></tr>
                  <tr><td>Style</td><td>{design.style}</td></tr>
                  <tr><td>Gender</td><td>{design.gender}</td></tr>
                  <tr><td>Lock Type</td><td>{design.lock_type}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Related Items Section ── */}
      {relatedItems.length > 0 && (
        <div className="max-w-[1500px] mx-auto w-full mt-10 pt-8 border-t border-gray-200/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200/60 shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">Related Items</h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-mono">
                  {relatedItems.length} Items
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Explore similar silver anklet designs from our wholesale collection
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedItems.map((relDesign) => {
              const thumbUrl = getRelatedDesignImage(relDesign);
              const approxPrice = getRelatedDesignPrice(relDesign);
              const defaultVariantId = relDesign.variants?.[0]?.id;
              const isWished = isInWishlist(relDesign.id, defaultVariantId);

              return (
                <div
                  key={relDesign.id}
                  onClick={() => {
                    if (onSelectProduct) {
                      onSelectProduct(relDesign.design_code || relDesign.name);
                    }
                  }}
                  className="group relative bg-white border border-gray-200 hover:border-gray-900 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  {/* Image Container */}
                  <div className="relative aspect-4/3 sm:aspect-square bg-gray-50 overflow-hidden">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={relDesign.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-medium bg-gray-100">
                        No Image
                      </div>
                    )}

                    {/* Purity Badge */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className="bg-white/95 backdrop-blur-md text-gray-900 text-[10px] font-bold px-2.5 py-1 rounded-full border border-gray-200 shadow-xs">
                        {relDesign.purity}% Fine
                      </span>
                    </div>

                    {/* Wishlist Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isWished) {
                          removeFromWishlist(relDesign.id, defaultVariantId);
                        } else {
                          addToWishlist(relDesign, defaultVariantId);
                        }
                      }}
                      className={`absolute top-2.5 right-2.5 z-10 p-2 rounded-full backdrop-blur-md transition-all shadow-xs ${
                        isWished
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-white/80 text-gray-500 hover:text-red-500 hover:bg-white border border-gray-200/80'
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${isWished ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                  </div>

                  {/* Details Container */}
                  <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-extrabold text-gray-900 text-sm sm:text-base group-hover:text-amber-700 transition-colors line-clamp-1">
                          {relDesign.design_code}
                        </h3>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {relDesign.metal}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                        {relDesign.name !== relDesign.design_code ? relDesign.name : (relDesign.finishing || 'High Polish')}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 font-semibold block uppercase">Approx. / Pc</span>
                        <span className="text-xs sm:text-sm font-extrabold text-gray-900 font-mono">
                          ₹{approxPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="h-7 w-7 rounded-full bg-gray-100 group-hover:bg-gray-900 group-hover:text-white transition-all flex items-center justify-center text-gray-600">
                        <ChevronRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Fullscreen Lightbox Modal ── */}
      {isLightboxOpen && (() => {
        const total = mediaList.length;
        const goPrev = (e?: React.MouseEvent) => { e?.stopPropagation(); setActiveMediaIdx(i => (i - 1 + total) % total); };
        const goNext = (e?: React.MouseEvent) => { e?.stopPropagation(); setActiveMediaIdx(i => (i + 1) % total); };

        return (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-sm"
            onClick={() => setIsLightboxOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') goPrev();
              if (e.key === 'ArrowRight') goNext();
              if (e.key === 'Escape') setIsLightboxOpen(false);
            }}
            tabIndex={0}
            style={{ outline: 'none' }}
          >
            {/* Close button */}
            <button
              className="absolute top-5 right-5 text-white hover:text-gray-300 p-2 cursor-pointer z-50 bg-white/10 hover:bg-white/20 rounded-full transition-all"
              onClick={() => setIsLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>

            {/* Counter */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-mono bg-black/40 px-3 py-1 rounded-full z-50">
              {activeMediaIdx + 1} / {total}
            </div>

            {/* Prev Arrow */}
            {total > 1 && (
              <button
                className="absolute left-3 sm:left-6 z-50 p-3 bg-white/10 hover:bg-white/25 text-white rounded-full transition-all cursor-pointer backdrop-blur-sm border border-white/20 hover:border-white/40 hover:scale-110"
                onClick={goPrev}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Media */}
            <div
              className="relative w-full max-w-[95vw] max-h-[92vh] flex items-center justify-center px-14 sm:px-18"
              onClick={(e) => e.stopPropagation()}
            >
              {currentMedia?.file_type?.startsWith('video') ? (
                <video
                  key={currentMedia.url}
                  src={currentMedia.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[88vh] object-contain rounded-xl shadow-2xl border border-gray-800"
                />
              ) : (
                <img
                  key={currentMedia?.url}
                  src={currentMedia?.url || ''}
                  alt={design.name}
                  className="max-w-full max-h-[88vh] object-contain rounded-xl shadow-2xl border border-gray-800"
                  style={{ transition: 'opacity 0.2s ease' }}
                />
              )}
            </div>

            {/* Next Arrow */}
            {total > 1 && (
              <button
                className="absolute right-3 sm:right-6 z-50 p-3 bg-white/10 hover:bg-white/25 text-white rounded-full transition-all cursor-pointer backdrop-blur-sm border border-white/20 hover:border-white/40 hover:scale-110"
                onClick={goNext}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Dot indicators */}
            {total > 1 && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50">
                {mediaList.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setActiveMediaIdx(i); }}
                    className={`rounded-full transition-all cursor-pointer ${
                      i === activeMediaIdx
                        ? 'bg-white w-5 h-2'
                        : 'bg-white/40 hover:bg-white/70 w-2 h-2'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
};

