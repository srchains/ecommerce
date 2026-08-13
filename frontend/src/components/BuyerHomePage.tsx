import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Sparkles, 
  ArrowRight, 
  ShoppingBag, 
  Eye, 
  Check, 
  ShieldCheck, 
  Truck, 
  Layers,
  Heart,
  TrendingUp
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CinematicHeroBanner } from './CinematicHeroBanner';
import type { BannerConfig, BannerSlide } from '../types/banner';

interface BuyerHomePageProps {
  onSelectProduct: (code: string, variantId?: number, sizeId?: number) => void;
  onExploreAll: () => void;
  onOpenCart?: () => void;
}

export const BuyerHomePage: React.FC<BuyerHomePageProps> = ({
  onSelectProduct,
  onExploreAll,
  onOpenCart,
}) => {
  const { designs, livePrice, calculatePriceBreakdown, addToCart, addToWishlist, removeFromWishlist, isInWishlist } = useApp();
  const [bannerConfig, setBannerConfig] = useState<BannerConfig | null>(null);

  // Fetch banner configuration
  useEffect(() => {
    const loadBanner = async () => {
      try {
        const res = await axios.get('/api/banner');
        if (res.data) setBannerConfig(res.data);
      } catch (err) {
        console.warn('Using default banner config', err);
      }
    };
    loadBanner();
  }, []);

  // Filter featured designs based on admin selection or fallback to top active designs
  const featuredDesigns = useMemo(() => {
    if (bannerConfig?.featured_design_codes && bannerConfig.featured_design_codes.length > 0) {
      const selected = designs.filter((d) =>
        bannerConfig.featured_design_codes.includes(d.design_code)
      );
      if (selected.length > 0) return selected;
    }
    // Default fallback: top 8 active designs
    return designs.filter((d) => d.status === 'Active' || !d.status).slice(0, 8);
  }, [designs, bannerConfig]);

  const handleSlideClick = (slide: BannerSlide) => {
    if (slide.design_code) {
      onSelectProduct(slide.design_code);
    } else {
      onExploreAll();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── 1. CINEMATIC LUXURY ANIMATED BANNER HERO ── */}
      <section aria-label="Featured Hero Banner">
        <CinematicHeroBanner
          config={bannerConfig}
          onSlideClick={handleSlideClick}
        />
      </section>

      {/* ── 2. VALUE PROPOSITION HIGHLIGHTS BAR ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200/80 rounded-2xl shadow-2xs">
          <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">92.5 Pure Silver</h4>
            <p className="text-[11px] text-amber-800/80 font-medium">BIS Hallmarked Wholesale Certified</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200 rounded-2xl shadow-2xs">
          <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Direct Factory Supply</h4>
            <p className="text-[11px] text-slate-600 font-medium">Ready Stock & Custom Bulk Orders</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200/80 rounded-2xl shadow-2xs">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">Transparent Live Rates</h4>
            <p className="text-[11px] text-emerald-800/80 font-medium">Real-time Spot Calculation</p>
          </div>
        </div>
      </div>

      {/* ── 3. FEATURED PRODUCTS SHOWCASE GRID ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-200">
              <Sparkles className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">
                Featured Collections & Highlights
              </h2>
              <p className="text-xs text-gray-500">
                Top rated wholesale silver anklet designs selected for you
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onExploreAll}
            className="hidden sm:flex items-center gap-1.5 text-xs font-extrabold text-amber-700 hover:text-amber-900 uppercase tracking-wider cursor-pointer group"
          >
            <span>View All ({designs.length})</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {featuredDesigns.map((design) => {
            const firstVariant = design.variants?.[0];
            const firstSize = firstVariant?.sizes?.[0];
            const mediaUrl = design.media?.[0]?.url || firstVariant?.media?.[0]?.url || '/logo.jpg';

            const totalReadyPcs = (design.variants || []).reduce((acc: number, v: any) => {
              return acc + (v.sizes || []).reduce((sAcc: number, s: any) => {
                if (s.status !== 'Active') return sAcc;
                return sAcc + Math.max(0, (s.stock_available || 0) - (s.stock_reserved || 0));
              }, 0);
            }, 0);

            // Calculate estimated price
            const sampleWeight = firstSize?.weight || 20.0;
            const priceInfo = calculatePriceBreakdown(
              sampleWeight,
              design.purity || 92.5,
              design.wastage_percent || 10,
              design.making_charge_per_gram || 0.4
            );

            const isLiked = isInWishlist(design.id);

            return (
              <div
                key={design.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs hover:shadow-lg hover:border-amber-400/50 transition-all duration-300 flex flex-col justify-between group"
              >
                {/* Image & Badges */}
                <div 
                  className="relative aspect-[4/3] bg-gray-50 overflow-hidden cursor-pointer"
                  onClick={() => onSelectProduct(design.design_code, firstVariant?.id, firstSize?.id)}
                >
                  <img
                    src={mediaUrl}
                    alt={design.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Stock Status Pill */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    {totalReadyPcs > 0 ? (
                      <span className="bg-emerald-600/90 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full backdrop-blur-xs shadow-xs flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        <span>Ready Stock: {totalReadyPcs} pcs</span>
                      </span>
                    ) : (
                      <span className="bg-amber-600/90 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full backdrop-blur-xs shadow-xs">
                        Make To Order
                      </span>
                    )}
                  </div>

                  {/* Wishlist button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isLiked) removeFromWishlist(design.id);
                      else addToWishlist(design.id);
                    }}
                    className="absolute top-2.5 right-2.5 p-2 bg-white/80 hover:bg-white text-gray-700 hover:text-red-500 rounded-full backdrop-blur-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>

                  {/* Collection badge */}
                  <div className="absolute bottom-2.5 left-2.5">
                    <span className="bg-black/60 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded backdrop-blur-xs border border-white/20">
                      {design.collection || 'Collection'}
                    </span>
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                      <span>{design.design_code}</span>
                      <span className="text-amber-700 font-bold">{design.purity || 92.5}% Silver</span>
                    </div>

                    <h3
                      className="text-sm font-extrabold text-gray-900 truncate mt-1 hover:text-amber-700 cursor-pointer transition-colors"
                      onClick={() => onSelectProduct(design.design_code, firstVariant?.id, firstSize?.id)}
                    >
                      {design.name}
                    </h3>

                    {design.weight_range && (
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        ⚖ {design.weight_range}
                      </p>
                    )}
                  </div>

                  {/* Price & Actions */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Est. Price / Pair</span>
                      <span className="text-sm font-extrabold text-gray-900 font-mono">
                        ₹{Math.round(priceInfo.total).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectProduct(design.design_code, firstVariant?.id, firstSize?.id)}
                        className="px-3 py-1.5 bg-gray-900 hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <span>View</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 4. MORE PRODUCTS SHOWCASE BUTTON (BOTTOM BANNER CTA) ── */}
      <section className="pt-4 pb-8">
        <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-3xl p-6 sm:p-10 text-white text-center space-y-4 shadow-2xl border border-amber-500/30 relative overflow-hidden">
          {/* Background decorative shine */}
          <div className="absolute -top-24 -left-24 w-60 h-60 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-amber-400/30">
              <Sparkles className="h-3 w-3" />
              <span>Full Wholesale Catalog</span>
            </span>

            <h3 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white">
              Explore All {designs.length}+ Silver Jewelry Collections
            </h3>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Browse our complete catalog of Double Kushboo, Battani, Varisu, Titanic, Jalar, Pakija, and Rasakulla designs with custom size selection, instant MOQ pricing, and live silver rate locking.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={onExploreAll}
                className="inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-sm uppercase tracking-wider rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 border border-amber-200"
              >
                <span>EXPLORE FULL CATALOGUE (MORE PRODUCTS)</span>
                <ArrowRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
