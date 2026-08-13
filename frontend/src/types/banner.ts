export type SceneEffect = 'pan' | 'zoom' | 'reversePan' | 'macro' | 'reveal' | 'hero';

export type BackgroundPreset = 
  | 'burgundy' 
  | 'royalPurple' 
  | 'midnightBlue' 
  | 'emerald' 
  | 'crimson' 
  | 'blackStudio';

export interface BannerSlide {
  id: string;
  image_url: string;
  title?: string;
  subtitle?: string;
  design_code?: string;
  effect?: SceneEffect;
  background?: BackgroundPreset;
}

export interface BannerConfig {
  enabled: boolean;
  global_effect: SceneEffect;
  duration_ms: number;
  slides: BannerSlide[];
  featured_design_codes: string[];
  featured_design_ids?: number[];
}

export const SCENE_EFFECT_LABELS: Record<SceneEffect, string> = {
  pan: 'Cinematic Pan',
  zoom: 'Slow Zoom',
  reversePan: 'Reverse Pan',
  macro: 'Macro Zoom',
  reveal: 'Reveal',
  hero: 'Cinematic Hero',
};

export const SELECTABLE_SCENE_EFFECTS: SceneEffect[] = [
  'pan',
  'zoom',
  'reversePan',
  'macro',
  'reveal',
  'hero',
];

export const DURATION_OPTIONS_MS = [3000, 4000, 5000, 6000, 8000, 10000];

export const BACKGROUND_GRADIENTS: Record<BackgroundPreset, string> = {
  burgundy: 'radial-gradient(120% 120% at 50% 30%, #3a0d14 0%, #1a0508 55%, #0a0203 100%)',
  royalPurple: 'radial-gradient(120% 120% at 50% 30%, #331a4d 0%, #180a26 55%, #08040f 100%)',
  midnightBlue: 'radial-gradient(120% 120% at 50% 30%, #0d2438 0%, #071322 55%, #030a12 100%)',
  emerald: 'radial-gradient(120% 120% at 50% 30%, #0e3327 0%, #071c17 55%, #030d0a 100%)',
  crimson: 'radial-gradient(120% 120% at 50% 30%, #4a0e14 0%, #22050a 55%, #0d0203 100%)',
  blackStudio: 'radial-gradient(120% 120% at 50% 30%, #1c1c1c 0%, #0c0c0c 55%, #000000 100%)',
};
