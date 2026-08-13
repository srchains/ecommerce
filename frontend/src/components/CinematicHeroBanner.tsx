import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, Sparkles, ArrowUpRight } from 'lucide-react';
import type { BannerConfig, BannerSlide, SceneEffect, BackgroundPreset } from '../types/banner';
import { BACKGROUND_GRADIENTS } from '../types/banner';
import './cinematic-hero-banner.css';

interface CinematicHeroBannerProps {
  config?: BannerConfig | null;
  onSlideClick?: (slide: BannerSlide) => void;
  overrideEffect?: SceneEffect;
  overrideDuration?: number;
}

export const CinematicHeroBanner: React.FC<CinematicHeroBannerProps> = ({
  config,
  onSlideClick,
  overrideEffect,
  overrideDuration,
}) => {
  const slides = useMemo(() => {
    if (config?.slides && config.slides.length > 0) {
      return config.slides;
    }
    // Fallback default slides if none loaded yet
    return [
      {
        id: 'fallback-1',
        image_url: '/uploads/media/PAKU1.jpg',
        title: 'Double Kushboo Collection',
        subtitle: 'Handcrafted 92.5 Pure Silver Anklets',
        design_code: 'DKUS01',
        effect: 'hero' as SceneEffect,
        background: 'burgundy' as BackgroundPreset,
      },
      {
        id: 'fallback-2',
        image_url: '/uploads/media/DSC_1416.jpg',
        title: 'Battani & Disco Series',
        subtitle: 'High Polish Daily & Bridal Wear',
        design_code: 'BAT01',
        effect: 'pan' as SceneEffect,
        background: 'royalPurple' as BackgroundPreset,
      },
      {
        id: 'fallback-3',
        image_url: '/uploads/media/DBLARU.jpg',
        title: 'Varisu & Titanic Elegance',
        subtitle: 'Intricate Link Work & Traditional Bells',
        design_code: 'TIT01',
        effect: 'zoom' as SceneEffect,
        background: 'emerald' as BackgroundPreset,
      },
    ];
  }, [config?.slides]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const durationMs = overrideDuration || config?.duration_ms || 5000;
  const globalEffect = overrideEffect || config?.global_effect || 'pan';

  const currentSlide = slides[currentIndex] || slides[0];

  const goTo = useCallback(
    (index: number) => {
      const len = slides.length || 1;
      setCurrentIndex(((index % len) + len) % len);
    },
    [slides.length]
  );

  const next = useCallback(() => {
    setCurrentIndex((prev) => (slides.length > 0 ? (prev + 1) % slides.length : 0));
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (slides.length > 0 ? (prev - 1 + slides.length) % slides.length : 0));
  }, [slides.length]);

  // Autoplay timer
  useEffect(() => {
    if (!isPlaying || !isVisible || slides.length <= 1) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = window.setTimeout(() => {
      next();
    }, durationMs);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, isVisible, slides.length, durationMs, currentIndex, next]);

  // IntersectionObserver to pause offscreen
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Preload next/prev images
  useEffect(() => {
    if (slides.length <= 1) return;
    const nextIdx = (currentIndex + 1) % slides.length;
    const prevIdx = (currentIndex - 1 + slides.length) % slides.length;
    [slides[nextIdx], slides[prevIdx]].forEach((s) => {
      if (s?.image_url) {
        const img = new Image();
        img.src = s.image_url;
      }
    });
  }, [currentIndex, slides]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === ' ') {
      e.preventDefault();
      setIsPlaying((p) => !p);
    }
  };

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) next();
      else prev();
    }
  };

  const activeEffect = globalEffect || currentSlide?.effect || 'pan';
  const activeBackground = currentSlide?.background || 'burgundy';
  const bgGradient = BACKGROUND_GRADIENTS[activeBackground] || BACKGROUND_GRADIENTS.burgundy;

  return (
    <div
      ref={containerRef}
      className="chb-root"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="SR Chains Silver Jewelry Animated Showcase"
      style={{
        ['--chb-duration' as any]: `${durationMs}ms`,
      }}
    >
      {/* Clickable Background & Media Layer */}
      <div
        className="chb-clickLayer"
        onClick={() => onSlideClick && currentSlide && onSlideClick(currentSlide)}
      >
        <div key={currentSlide.id || currentIndex} className="chb-scene" style={{ background: bgGradient }}>
          {/* Bokeh lighting atmosphere */}
          <div className="chb-bokeh chb-bokeh--a" aria-hidden="true" />
          <div className="chb-bokeh chb-bokeh--b" aria-hidden="true" />
          <div className="chb-bokeh chb-bokeh--c" aria-hidden="true" />

          {/* Animated Product Image */}
          <div className="chb-imageWrap">
            <img
              src={currentSlide.image_url}
              alt={currentSlide.title || 'SR Chains Silver Anklet'}
              className={`chb-image chb-anim-${activeEffect}`}
              loading="eager"
            />
            {/* Light sweep effect */}
            <div className="chb-lightSweep" aria-hidden="true" />
            {/* Sparkle effect */}
            <div className="chb-sparkle" aria-hidden="true" />
          </div>

          {/* Vignette border */}
          <div className="chb-vignette" aria-hidden="true" />
        </div>
      </div>

      {/* Slide Branding & Title Overlay */}
      <div className="chb-branding">
        <span className="chb-brandName">
          {currentSlide.title || 'SR CHAINS'}
        </span>
        <span className="chb-brandSub">
          {currentSlide.subtitle || 'PURE 92.5 SILVER ANKLETS COLLECTION'}
        </span>
      </div>

      {/* SKU / Design Code Badge */}
      {currentSlide.design_code && (
        <div 
          className="chb-skuBadge cursor-pointer"
          onClick={() => onSlideClick && onSlideClick(currentSlide)}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span>{currentSlide.design_code}</span>
          <ArrowUpRight className="h-3 w-3 text-amber-300" />
        </div>
      )}

      {/* Progress Dots */}
      {slides.length > 1 && (
        <div className="chb-dots">
          {slides.map((s, idx) => (
            <button
              key={s.id || idx}
              type="button"
              onClick={() => goTo(idx)}
              className={`chb-dot ${idx === currentIndex ? 'chb-dot--active' : ''}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Play / Pause Button */}
      {slides.length > 1 && (
        <button
          type="button"
          onClick={() => setIsPlaying((p) => !p)}
          className="chb-playBtn"
          title={isPlaying ? 'Pause banner' : 'Play banner'}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
        </button>
      )}

      {/* Next / Previous Arrow Controls */}
      {slides.length > 1 && (
        <div className="chb-controlsWrap">
          <button
            type="button"
            onClick={prev}
            className="chb-controlBtn"
            title="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className="chb-controlBtn"
            title="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};
