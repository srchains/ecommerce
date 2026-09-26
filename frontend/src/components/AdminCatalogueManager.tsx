import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  FileDown, FileText, Search, Check, AlertCircle, CheckSquare, Square, Save, Eye, EyeOff,
  ChevronRight, ChevronDown
} from 'lucide-react';
import { API_BASE_URL, useApp } from '../context/AppContext';
import { ALL_COLLECTIONS_KEY } from '../utils/catalogPdfGenerator';

interface CatalogueVariant {
  id: number;
  variant_code: string;
  variant_name: string;
  thumbnail_url: string | null;
  is_visible_to_buyer: boolean;
}

interface CatalogueDesign {
  id: number;
  design_code: string;
  name: string;
  thumbnail_url: string | null;
  is_visible_to_buyer: boolean;
  variants: CatalogueVariant[];
}

interface CatalogueItem {
  key: string;
  name: string;
  file_type: string;
  design_count: number;
  thumbnail_url: string | null;
  is_visible_to_buyer: boolean;
  designs: CatalogueDesign[];
}

type BoolMap<K extends string | number> = Record<K, boolean>;

const thumbUrl = (url: string | null) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

/** Checkbox that can show the "partly selected" (–) state. */
const TreeCheckbox: React.FC<{ checked: boolean; indeterminate?: boolean; onChange: (v: boolean) => void; label: string }> = ({
  checked, indeterminate, onChange, label
}) => (
  <input
    type="checkbox"
    aria-label={label}
    checked={checked}
    ref={el => { if (el) el.indeterminate = !!indeterminate && checked; }}
    onChange={(e) => onChange(e.target.checked)}
    onClick={(e) => e.stopPropagation()}
    className="h-4 w-4 accent-amber-600 cursor-pointer shrink-0"
  />
);

const Thumb: React.FC<{ url: string | null; alt: string; size: string }> = ({ url, alt, size }) => {
  const src = thumbUrl(url);
  return (
    <div className={`${size} rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0`}>
      {src ? <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" /> : <FileText className="h-4 w-4 text-amber-600" />}
    </div>
  );
};

const VisibleBadge: React.FC<{ visible: boolean }> = ({ visible }) => (
  <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border shrink-0 ${
    visible ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'
  }`}>
    {visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
    {visible ? 'Visible' : 'Hidden'}
  </span>
);

export const AdminCatalogueManager: React.FC = () => {
  const { adminRole, refreshBuyerCatalogue } = useApp();
  const [items, setItems] = useState<CatalogueItem[]>([]);
  // Current (unsaved) selection
  const [collSel, setCollSel] = useState<BoolMap<string>>({});
  const [designSel, setDesignSel] = useState<BoolMap<number>>({});
  const [variantSel, setVariantSel] = useState<BoolMap<number>>({});
  const [expandedColls, setExpandedColls] = useState<Set<string>>(new Set());
  const [expandedDesigns, setExpandedDesigns] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const applyItems = (data: CatalogueItem[]) => {
    setItems(data);
    const c: BoolMap<string> = {}, d: BoolMap<number> = {}, v: BoolMap<number> = {};
    data.forEach(item => {
      c[item.key] = item.is_visible_to_buyer;
      item.designs.forEach(des => {
        d[des.id] = des.is_visible_to_buyer;
        des.variants.forEach(va => { v[va.id] = va.is_visible_to_buyer; });
      });
    });
    setCollSel(c); setDesignSel(d); setVariantSel(v);
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/catalogue/admin`);
      applyItems(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not load catalogue items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const flash = (msg: string) => { setOk(msg); setTimeout(() => setOk(null), 3000); };

  const toggleSet = <T,>(set: Set<T>, key: T) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  };

  // ── Search: match catalogue name, design name/code, or variant name/code ──
  const query = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return items;
    return items
      .map(item => {
        if (item.name.toLowerCase().includes(query)) return item;
        const designs = item.designs.filter(d =>
          d.name.toLowerCase().includes(query) ||
          d.design_code.toLowerCase().includes(query) ||
          d.variants.some(v => v.variant_name.toLowerCase().includes(query) || v.variant_code.toLowerCase().includes(query))
        );
        return designs.length ? { ...item, designs } : null;
      })
      .filter(Boolean) as CatalogueItem[];
  }, [items, query]);

  // ── Selection changes (cascade down; checking a child also checks its parents) ──
  const setDesignTree = (design: CatalogueDesign, visible: boolean, d: BoolMap<number>, v: BoolMap<number>) => {
    d[design.id] = visible;
    design.variants.forEach(va => { v[va.id] = visible; });
  };

  const onCollection = (item: CatalogueItem, visible: boolean) => {
    const d = { ...designSel }, v = { ...variantSel };
    item.designs.forEach(des => setDesignTree(des, visible, d, v));
    setCollSel(prev => ({ ...prev, [item.key]: visible }));
    setDesignSel(d); setVariantSel(v);
  };

  const onDesign = (item: CatalogueItem, design: CatalogueDesign, visible: boolean) => {
    const d = { ...designSel }, v = { ...variantSel };
    setDesignTree(design, visible, d, v);
    setDesignSel(d); setVariantSel(v);
    if (visible) setCollSel(prev => ({ ...prev, [item.key]: true }));
  };

  const onVariant = (item: CatalogueItem, design: CatalogueDesign, variant: CatalogueVariant, visible: boolean) => {
    setVariantSel(prev => ({ ...prev, [variant.id]: visible }));
    if (visible) {
      setDesignSel(prev => ({ ...prev, [design.id]: true }));
      setCollSel(prev => ({ ...prev, [item.key]: true }));
    }
  };

  // Select/Deselect All act on everything currently shown (respects the search box).
  const setAllShown = (visible: boolean) => {
    const c = { ...collSel }, d = { ...designSel }, v = { ...variantSel };
    filtered.forEach(item => {
      c[item.key] = visible;
      item.designs.forEach(des => setDesignTree(des, visible, d, v));
    });
    setCollSel(c); setDesignSel(d); setVariantSel(v);
  };

  // ── Counts / dirty state ──
  const designIsPartial = (des: CatalogueDesign) =>
    des.variants.some(va => !variantSel[va.id]);
  const collectionIsPartial = (item: CatalogueItem) =>
    item.designs.some(des => !designSel[des.id] || designIsPartial(des));
  const selectedDesignCount = (item: CatalogueItem) =>
    item.designs.filter(des => designSel[des.id] && des.variants.some(va => variantSel[va.id])).length;

  const allDesigns = items.flatMap(i => i.designs);
  const dirty =
    items.some(i => collSel[i.key] !== i.is_visible_to_buyer) ||
    allDesigns.some(d => designSel[d.id] !== d.is_visible_to_buyer) ||
    allDesigns.some(d => d.variants.some(v => variantSel[v.id] !== v.is_visible_to_buyer));
  const visibleCount = items.filter(i => collSel[i.key]).length;

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await axios.put(`${API_BASE_URL}/api/catalogue/admin`, {
        items: items.map(i => ({ key: i.key, is_visible_to_buyer: !!collSel[i.key] })),
        designs: allDesigns.map(d => ({ id: d.id, is_visible_to_buyer: !!designSel[d.id] })),
        variants: allDesigns.flatMap(d => d.variants.map(v => ({ id: v.id, is_visible_to_buyer: !!variantSel[v.id] }))),
      });
      applyItems(res.data);
      refreshBuyerCatalogue();
      flash('Catalogue selection saved. Buyers now download only the selected catalogues, designs and variants.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not save the catalogue selection.');
    } finally {
      setSaving(false);
    }
  };

  if (adminRole !== 'admin') {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Only the admin can manage the Download Catalogue.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <div className="flex items-center gap-2.5">
          <FileDown className="h-6 w-6 text-amber-600" />
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Catalogue Manager</h1>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Choose which catalogue PDFs buyers can download, and which designs and variants go inside them.
          Click the arrow on a catalogue to pick its designs, and on a design to pick its variants.
          New collections, designs and variants are included until you turn them off.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
        </div>
      )}
      {ok && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" /><span>{ok}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search catalogues, designs or variants…"
              className="input pl-9 text-sm"
            />
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAllShown(true)}
              className="flex-1 sm:flex-none px-3 py-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckSquare className="h-3.5 w-3.5" /> Select All
            </button>
            <button
              onClick={() => setAllShown(false)}
              className="flex-1 sm:flex-none px-3 py-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Square className="h-3.5 w-3.5" /> Deselect All
            </button>
          </div>
        </div>

        {/* Tree */}
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading catalogues…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            {items.length === 0 ? 'No catalogues yet. Add active designs to create collections.' : 'No catalogues match your search.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map(item => {
              const isAll = item.key === ALL_COLLECTIONS_KEY;
              const visible = !!collSel[item.key];
              // While searching, show matching designs without needing to click the arrow.
              const expanded = !isAll && (expandedColls.has(item.key) || (!!query && item.designs.length > 0));
              return (
                <li key={item.key}>
                  <div
                    className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => !isAll && setExpandedColls(prev => toggleSet(prev, item.key))}
                  >
                    <span className="w-4 shrink-0 text-gray-400">
                      {!isAll && (expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                    </span>
                    <TreeCheckbox
                      label={`Show ${item.name} to buyers`}
                      checked={visible}
                      indeterminate={!isAll && collectionIsPartial(item)}
                      onChange={(v) => onCollection(item, v)}
                    />
                    <Thumb url={item.thumbnail_url} alt={item.name} size="h-12 w-12" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">
                        {isAll ? item.name : `${item.name} PDF`}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{item.file_type}</span>
                        {isAll ? (
                          <span>includes only the selected catalogues, designs and variants</span>
                        ) : (
                          <span>{selectedDesignCount(item)} of {item.design_count} design{item.design_count === 1 ? '' : 's'} selected</span>
                        )}
                      </div>
                    </div>
                    <VisibleBadge visible={visible} />
                  </div>

                  {/* Designs */}
                  {expanded && (
                    <ul className={`bg-gray-50/60 border-t border-gray-100 ${visible ? '' : 'opacity-60'}`}>
                      {item.designs.map(design => {
                        const dVisible = !!designSel[design.id];
                        const dExpanded = expandedDesigns.has(design.id);
                        const selVariants = design.variants.filter(va => variantSel[va.id]).length;
                        return (
                          <li key={design.id} className="border-b border-gray-100 last:border-b-0">
                            <div
                              className="flex items-center gap-2 sm:gap-3 pl-8 sm:pl-12 pr-3 sm:pr-4 py-2.5 hover:bg-white cursor-pointer"
                              onClick={() => design.variants.length && setExpandedDesigns(prev => toggleSet(prev, design.id))}
                            >
                              <span className="w-4 shrink-0 text-gray-400">
                                {design.variants.length > 0 && (dExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                              </span>
                              <TreeCheckbox
                                label={`Include design ${design.name}`}
                                checked={dVisible}
                                indeterminate={designIsPartial(design)}
                                onChange={(v) => onDesign(item, design, v)}
                              />
                              <Thumb url={design.thumbnail_url} alt={design.name} size="h-10 w-10" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-gray-900 truncate">{design.name}</div>
                                <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                                  <span className="font-mono">{design.design_code}</span>
                                  {' · '}
                                  {design.variants.length === 0
                                    ? 'no variants (not in PDF)'
                                    : `${selVariants} of ${design.variants.length} variant${design.variants.length === 1 ? '' : 's'}`}
                                </div>
                              </div>
                            </div>

                            {/* Variants */}
                            {dExpanded && (
                              <ul className={`pb-1 ${dVisible ? '' : 'opacity-60'}`}>
                                {design.variants.map(variant => (
                                  <li key={variant.id}>
                                    <label className="flex items-center gap-2 sm:gap-3 pl-16 sm:pl-24 pr-3 sm:pr-4 py-2 hover:bg-white cursor-pointer">
                                      <TreeCheckbox
                                        label={`Include variant ${variant.variant_name}`}
                                        checked={!!variantSel[variant.id]}
                                        onChange={(v) => onVariant(item, design, variant, v)}
                                      />
                                      <Thumb url={variant.thumbnail_url} alt={variant.variant_name} size="h-8 w-8" />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-semibold text-gray-800 truncate">{variant.variant_name}</div>
                                        <div className="text-[10px] font-mono text-gray-500 truncate">{variant.variant_code}</div>
                                      </div>
                                    </label>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer / Save */}
        <div className="sticky bottom-0 p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs text-gray-500">
            <b className="text-gray-800">{visibleCount}</b> of {items.length} catalogues visible to buyers
            {dirty && <span className="ml-2 text-amber-700 font-bold">· Unsaved changes</span>}
          </span>
          <button
            onClick={save}
            disabled={saving || loading || !dirty}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
