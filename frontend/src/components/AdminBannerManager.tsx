import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Sparkles, 
  Upload, 
  Trash2, 
  Plus, 
  Save, 
  Check, 
  AlertCircle, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Clock, 
  Film, 
  Layers
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CinematicHeroBanner } from './CinematicHeroBanner';
import type { BannerConfig, BannerSlide, BackgroundPreset } from '../types/banner';
import { 
  SCENE_EFFECT_LABELS, 
  SELECTABLE_SCENE_EFFECTS, 
  DURATION_OPTIONS_MS
} from '../types/banner';

export const AdminBannerManager: React.FC = () => {
  const { designs } = useApp();
  const [config, setConfig] = useState<BannerConfig>({
    enabled: true,
    global_effect: 'pan',
    duration_ms: 5000,
    slides: [],
    featured_design_codes: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch banner config on load
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/banner');
      if (res.data) {
        setConfig(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load banner config', err);
      setError('Could not load banner settings from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Save banner configuration
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await axios.post('/api/banner', config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save banner config', err);
      setError('Failed to save banner settings.');
    } finally {
      setSaving(false);
    }
  };

  // Upload custom hero banner image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setSaving(true);
      const res = await axios.post('/api/banner/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.url) {
        const newSlide: BannerSlide = {
          id: `slide-${Date.now()}`,
          image_url: res.data.url,
          title: file.name.replace(/\.[^/.]+$/, ''),
          subtitle: 'Pure 92.5 Silver Craftsmanship',
          design_code: designs[0]?.design_code || '',
          effect: config.global_effect,
          background: 'burgundy',
        };

        setConfig((prev) => ({
          ...prev,
          slides: [...prev.slides, newSlide],
        }));
      }
    } catch (err: any) {
      console.error('Failed to upload image', err);
      setError(err.response?.data?.detail || 'Image upload failed.');
    } finally {
      setSaving(false);
      if (e.target) e.target.value = '';
    }
  };

  // Add slide from existing catalog product design
  const handleAddFromDesign = (design: any) => {
    const mediaUrl = design.media?.[0]?.url || '/uploads/media/PAKU1.jpg';
    const newSlide: BannerSlide = {
      id: `slide-${Date.now()}`,
      image_url: mediaUrl,
      title: `${design.name} Collection`,
      subtitle: `${design.collection || 'Signature'} Pure 92.5 Silver`,
      design_code: design.design_code,
      effect: config.global_effect,
      background: 'royalPurple',
    };

    setConfig((prev) => ({
      ...prev,
      slides: [...prev.slides, newSlide],
      featured_design_codes: prev.featured_design_codes.includes(design.design_code)
        ? prev.featured_design_codes
        : [...prev.featured_design_codes, design.design_code],
    }));
  };

  const handleRemoveSlide = (slideId: string) => {
    setConfig((prev) => ({
      ...prev,
      slides: prev.slides.filter((s) => s.id !== slideId),
    }));
  };

  const handleUpdateSlide = (slideId: string, updates: Partial<BannerSlide>) => {
    setConfig((prev) => ({
      ...prev,
      slides: prev.slides.map((s) => (s.id === slideId ? { ...s, ...updates } : s)),
    }));
  };

  const toggleFeaturedDesign = (designCode: string) => {
    setConfig((prev) => {
      const exists = prev.featured_design_codes.includes(designCode);
      return {
        ...prev,
        featured_design_codes: exists
          ? prev.featured_design_codes.filter((c) => c !== designCode)
          : [...prev.featured_design_codes, designCode],
      };
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-amber-700 font-bold text-sm">
          <div className="animate-spin h-5 w-5 border-2 border-amber-600 border-t-transparent rounded-full" />
          <span>Loading Banner Configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-6 w-6 text-amber-600" />
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Banner & Hero Animation Manager
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Configure animated luxury banner slideshows, animation styles, timings, and featured products displayed on the customer landing page.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-in fade-in">
              <Check className="h-4 w-4" />
              <span>Saved Successfully!</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Banner Settings'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Live Interactive Preview Screen */}
      <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 text-white space-y-4 shadow-xl border border-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-400">
            <Film className="h-4 w-4" />
            <span>Live Interactive Preview</span>
          </div>

          {/* Device viewport switch */}
          <div className="flex items-center gap-1 bg-gray-800/80 p-1 rounded-lg border border-gray-700 text-xs">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                previewDevice === 'desktop' ? 'bg-amber-600 text-white shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>Laptop</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('tablet')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                previewDevice === 'tablet' ? 'bg-amber-600 text-white shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Tablet className="h-3.5 w-3.5" />
              <span>Tablet</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                previewDevice === 'mobile' ? 'bg-amber-600 text-white shadow-xs' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Mobile</span>
            </button>
          </div>
        </div>

        {/* Scaled Preview Box */}
        <div className="flex justify-center p-2">
          <div
            className={`w-full transition-all duration-300 ${
              previewDevice === 'mobile'
                ? 'max-w-sm'
                : previewDevice === 'tablet'
                ? 'max-w-2xl'
                : 'max-w-full'
            }`}
          >
            <CinematicHeroBanner
              config={config}
              overrideEffect={config.global_effect}
              overrideDuration={config.duration_ms}
            />
          </div>
        </div>
      </div>

      {/* Animation Style & Timing Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Animation Motion Effect */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
            <Film className="h-4.5 w-4.5 text-amber-600" />
            <span>Animation Motion Effect</span>
          </div>
          <p className="text-xs text-gray-500">
            Select the cinematic camera motion applied to jewelry images in the banner:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {SELECTABLE_SCENE_EFFECTS.map((effect) => {
              const isSelected = config.global_effect === effect;
              return (
                <button
                  key={effect}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, global_effect: effect }))}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center ${
                    isSelected
                      ? 'bg-amber-50 text-amber-950 border-amber-500 ring-2 ring-amber-400/30 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {SCENE_EFFECT_LABELS[effect]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scene Duration / Slide Timing */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
            <Clock className="h-4.5 w-4.5 text-amber-600" />
            <span>Slide Duration / Animation Speed</span>
          </div>
          <p className="text-xs text-gray-500">
            Select how many seconds each banner image stays on screen before transitioning:
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {DURATION_OPTIONS_MS.map((ms) => {
              const isSelected = config.duration_ms === ms;
              return (
                <button
                  key={ms}
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, duration_ms: ms }))}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {ms / 1000}s
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Slide Image Management */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
              <Layers className="h-4.5 w-4.5 text-amber-600" />
              <span>Banner Slides ({config.slides.length})</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload high-resolution anklet photos or select from existing catalog designs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-300 cursor-pointer transition-all shadow-2xs"
            >
              <Upload className="h-3.5 w-3.5 text-amber-700" />
              <span>+ Upload New Image</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        </div>

        {/* Existing Slides List */}
        {config.slides.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-xl">
            No custom slides added yet. Default catalog highlights will be shown.
          </div>
        ) : (
          <div className="space-y-3">
            {config.slides.map((slide, idx) => (
              <div
                key={slide.id || idx}
                className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-3.5 bg-gray-50/80 border border-gray-200 rounded-xl hover:border-gray-300 transition-all"
              >
                {/* Thumbnail */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="h-14 w-20 bg-gray-900 rounded-lg overflow-hidden shrink-0 border border-gray-300 flex items-center justify-center">
                    <img
                      src={slide.image_url}
                      alt={slide.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                      Slide #{idx + 1}
                    </span>
                    <p className="text-xs font-extrabold text-gray-900 truncate mt-0.5">
                      {slide.title || 'Untitled Slide'}
                    </p>
                  </div>
                </div>

                {/* Edit Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto flex-1 max-w-2xl">
                  <input
                    type="text"
                    placeholder="Slide Title"
                    value={slide.title || ''}
                    onChange={(e) => handleUpdateSlide(slide.id, { title: e.target.value })}
                    className="px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Slide Subtitle"
                    value={slide.subtitle || ''}
                    onChange={(e) => handleUpdateSlide(slide.id, { subtitle: e.target.value })}
                    className="px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg"
                  />
                  {/* Background atmosphere picker */}
                  <select
                    value={slide.background || 'burgundy'}
                    onChange={(e) => handleUpdateSlide(slide.id, { background: e.target.value as BackgroundPreset })}
                    className="px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-lg"
                  >
                    <option value="burgundy">Burgundy Dark</option>
                    <option value="royalPurple">Royal Purple</option>
                    <option value="midnightBlue">Midnight Blue</option>
                    <option value="emerald">Emerald Green</option>
                    <option value="crimson">Crimson Red</option>
                    <option value="blackStudio">Black Studio</option>
                  </select>
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveSlide(slide.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors shrink-0"
                  title="Remove Slide"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Quick Add from Existing Catalog Designs */}
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-700 mb-2">Quick Add from Catalog Designs:</p>
          <div className="flex flex-wrap gap-2">
            {designs.slice(0, 12).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => handleAddFromDesign(d)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 text-gray-800 text-[11px] font-bold rounded-lg border border-gray-200 transition-all cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>{d.name} ({d.design_code})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Products Selection (Displayed Below Banner) */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
            <Sparkles className="h-4.5 w-4.5 text-amber-600" />
            <span>Featured Products Below Banner ({config.featured_design_codes.length} Selected)</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Select the specific product designs that will be highlighted directly under the animated banner on the buyer landing page.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {designs.map((design) => {
            const isFeatured = config.featured_design_codes.includes(design.design_code);
            const thumb = design.media?.[0]?.url || '/logo.jpg';

            return (
              <div
                key={design.id}
                onClick={() => toggleFeaturedDesign(design.design_code)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                  isFeatured
                    ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-400/40 shadow-xs'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-2">
                  <img src={thumb} alt={design.name} className="h-full w-full object-cover" />
                  {isFeatured && (
                    <span className="absolute top-1 right-1 bg-amber-600 text-white rounded-full p-0.5">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-gray-500">
                    {design.design_code}
                  </span>
                  <p className="text-xs font-extrabold text-gray-900 truncate">
                    {design.name}
                  </p>
                  <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                    {design.collection || 'Collection'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
