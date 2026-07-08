import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { MediaItem } from '../context/AppContext';

import { 
  ArrowLeft, 
  ShoppingBag,
  Check, 
  Play,
  Heart,
  Share2,
  X
} from 'lucide-react';

interface BuyerProductDetailProps {
  designCode: string;
  initialVariantId?: number;
  initialSizeId?: number;
  onBack: () => void;
}

export const BuyerProductDetail: React.FC<BuyerProductDetailProps> = ({ 
  designCode, 
  initialVariantId,
  initialSizeId,
  onBack 
}) => {
  const { designs, livePrice, calculatePriceBreakdown, addToCart, addToWishlist, removeFromWishlist, isInWishlist } = useApp();

  const design = designs.find(d => d.name === designCode || d.design_code === designCode);

  if (!design) {
    return (
      <div className="p-8 text-center text-gray-500">
        Product not found. <button onClick={onBack} className="text-gray-900 font-medium hover:underline">Go Back</button>
      </div>
    );
  }

  const [selectedVariantId, setSelectedVariantId] = useState<number>(initialVariantId || design.variants[0]?.id || 0);
  const activeVariant = design.variants.find(v => v.id === selectedVariantId) || design.variants[0];

  const availableSizes = activeVariant?.sizes.filter(s => s.size >= 5.0 && s.size <= 11.0) || activeVariant?.sizes || [];
  const [selectedSizeId, setSelectedSizeId] = useState<number>(
    (initialSizeId && availableSizes.some(s => s.id === initialSizeId))
      ? initialSizeId
      : availableSizes[0]?.id || activeVariant?.sizes[0]?.id || 0
  );
  const activeSize = availableSizes.find(s => s.id === selectedSizeId) || availableSizes[0] || activeVariant?.sizes[0];

  const [orderType, setOrderType] = useState<'ready_stock' | 'make_order'>('ready_stock');
  const [quantity, setQuantity] = useState<number>(design.moq);
  const [addedToCartMsg, setAddedToCartMsg] = useState(false);

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

  // Sync selected variant/size from cart details
  useEffect(() => {
    if (initialVariantId) {
      setSelectedVariantId(initialVariantId);
      setActiveMediaIdx(0);
    }
  }, [initialVariantId]);

  useEffect(() => {
    if (initialSizeId) {
      setSelectedSizeId(initialSizeId);
    }
  }, [initialSizeId]);

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

  // Automatically switch to 'make_order' if activeSize has no stock
  useEffect(() => {
    if (activeSize && activeSize.stock_available === 0) {
      setOrderType('make_order');
    } else {
      setOrderType('ready_stock');
    }
  }, [activeSize]);

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

  const weight = activeSize ? activeSize.weight : 20.0;
  const priceBreakdown = calculatePriceBreakdown(
    weight,
    design.purity,
    design.wastage_percent,
    design.making_charge_per_gram
  );

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

  const handleAddToCart = () => {
    if (!activeSize || !activeVariant) return;

    if (quantity < design.moq) {
      alert(`Minimum order quantity for this design is ${design.moq} pieces.`);
      return;
    }

    if (orderType === 'ready_stock' && activeSize.stock_available === 0) {
      alert("Stock is empty, please select Make Order.");
      return;
    }

    if (orderType === 'ready_stock' && quantity > activeSize.stock_available) {
      alert(`Only ${activeSize.stock_available} pieces are currently available in Ready Stock. Switch to 'Make Order' to purchase larger quantities.`);
      return;
    }

    addToCart({
      design,
      variant: activeVariant,
      size: activeSize,
      quantity,
      orderType
    });

    setAddedToCartMsg(true);
    setTimeout(() => setAddedToCartMsg(false), 3000);
  };

  // Load active variant media
  let mediaList: MediaItem[] = (activeVariant?.media && activeVariant.media.length > 0) ? activeVariant.media : [];
  
  // If active variant has no media, fall back to design (mother) media
  if (mediaList.length === 0) {
    mediaList = (design.media && design.media.length > 0) ? design.media : [];
  }
  
  // If design media is also empty, find any variant that has media
  if (mediaList.length === 0) {
    const firstVarWithMedia = design.variants.find(v => v.media && v.media.length > 0);
    if (firstVarWithMedia) {
      mediaList = firstVarWithMedia.media || [];
    }
  }

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

      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Catalog</span>
        </button>

        {/* Wishlist button on product detail */}
        <button
          onClick={() => {
            if (isInWishlist(design.id)) {
              removeFromWishlist(design.id);
            } else {
              addToWishlist(design);
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
            isInWishlist(design.id)
              ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
              : 'bg-white border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500'
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${isInWishlist(design.id) ? 'fill-red-500 text-red-500' : ''}`} />
          <span>{isInWishlist(design.id) ? 'Wishlisted' : 'Wishlist'}</span>
        </button>
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
                    if (isInWishlist(design.id)) {
                      removeFromWishlist(design.id);
                    } else {
                      addToWishlist(design);
                    }
                  }}
                  title={isInWishlist(design.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                  className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 shadow-sm cursor-pointer transition-colors"
                >
                  <Heart className={`h-4.5 w-4.5 transition-colors ${isInWishlist(design.id) ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'}`} />
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
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold border shadow-sm transition-all ${
                activeSize && activeSize.stock_available > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}>
                {activeSize && activeSize.stock_available > 0 ? 'In Stock' : 'Make Order'}
              </span>
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
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSizeId(s.id)}
                      className={`size-button flex items-center justify-center text-center relative cursor-pointer py-3.5 ${
                        isSelected ? 'size-button-selected' : ''
                      }`}
                    >
                      <span className="text-sm font-bold font-mono">{s.size.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

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
                  Total Price / Piece
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

          <div className="enterprise-panel p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-1 border border-gray-200 rounded-xl text-sm">
              <button
                onClick={() => {
                  if (activeSize && activeSize.stock_available === 0) {
                    alert("Stock is empty, please select Make Order.");
                    setOrderType('make_order');
                  } else {
                    setOrderType('ready_stock');
                  }
                }}
                className={`py-2 rounded-lg font-semibold flex flex-col items-center justify-center transition-all cursor-pointer ${
                  orderType === 'ready_stock' 
                    ? 'bg-white border border-gray-300 text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span>Ready Stock</span>
                <span className="text-[11px] text-gray-500 mt-0.5">Available: {activeSize ? activeSize.stock_available : 0} pcs</span>
              </button>

              <button
                onClick={() => setOrderType('make_order')}
                className={`py-2 rounded-lg font-semibold flex flex-col items-center justify-center transition-all cursor-pointer ${
                  orderType === 'make_order' 
                    ? 'bg-white border border-gray-300 text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span>Make Order (MTO)</span>
                <span className="text-[11px] text-gray-500 mt-0.5">Lead-time: 7-10 days</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider block">Quantity (pcs)</span>
                <div className="qty-control">
                  <button onClick={() => setQuantity(q => Math.max(design.moq, q - 1))} className="cursor-pointer">-</button>
                  <span>{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)} className="cursor-pointer">+</button>
                </div>
              </div>

              <div className="flex-1">
                <button
                  onClick={handleAddToCart}
                  className="btn-primary w-full cursor-pointer"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>



            {addedToCartMsg && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs flex items-center space-x-2 font-medium">
                <Check className="h-4 w-4 shrink-0" />
                <span>Anklet specification successfully added to your checkout cart.</span>
              </div>
            )}
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

