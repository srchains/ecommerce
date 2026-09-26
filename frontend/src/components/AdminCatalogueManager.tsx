import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FileDown, FileText, Search, Check, AlertCircle, CheckSquare, Square, Save, Eye, EyeOff } from 'lucide-react';
import { API_BASE_URL, useApp } from '../context/AppContext';
import { ALL_COLLECTIONS_KEY } from '../utils/catalogPdfGenerator';

interface CatalogueItem {
  key: string;
  name: string;
  file_type: string;
  design_count: number;
  thumbnail_url: string | null;
  is_visible_to_buyer: boolean;
}

const thumbUrl = (url: string | null) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const AdminCatalogueManager: React.FC = () => {
  const { adminRole, refreshBuyerCatalogue } = useApp();
  const [items, setItems] = useState<CatalogueItem[]>([]);
  // key -> visible, as currently edited (unsaved)
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const applyItems = (data: CatalogueItem[]) => {
    setItems(data);
    setSelection(Object.fromEntries(data.map(i => [i.key, i.is_visible_to_buyer])));
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter(i => i.name.toLowerCase().includes(q)) : items;
  }, [items, search]);

  const dirty = items.some(i => selection[i.key] !== i.is_visible_to_buyer);
  const visibleCount = items.filter(i => selection[i.key]).length;

  // Select/Deselect All act on the rows currently shown (respects the search box).
  const setAllShown = (visible: boolean) => {
    setSelection(prev => {
      const next = { ...prev };
      filtered.forEach(i => { next[i.key] = visible; });
      return next;
    });
  };

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await axios.put(`${API_BASE_URL}/api/catalogue/admin`, {
        items: items.map(i => ({ key: i.key, is_visible_to_buyer: !!selection[i.key] })),
      });
      applyItems(res.data);
      refreshBuyerCatalogue();
      flash('Catalogue selection saved. Buyers now see only the selected catalogues.');
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
          Choose which catalogue PDFs buyers can download from "Download Catalog". Unselected catalogues are
          hidden from buyers. New collections are visible until you turn them off.
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
              placeholder="Search catalogues…"
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

        {/* List */}
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading catalogues…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            {items.length === 0 ? 'No catalogues yet. Add active designs to create collections.' : 'No catalogues match your search.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map(item => {
              const visible = !!selection[item.key];
              const src = thumbUrl(item.thumbnail_url);
              return (
                <li key={item.key}>
                  <label className="flex items-center gap-3 sm:gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={(e) => setSelection(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      className="h-4 w-4 accent-amber-600 cursor-pointer shrink-0"
                    />
                    <div className="h-12 w-12 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                      {src ? (
                        <img src={src} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <FileText className="h-5 w-5 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">
                        {item.key === ALL_COLLECTIONS_KEY ? item.name : `${item.name} PDF`}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{item.file_type}</span>
                        <span>{item.design_count} design{item.design_count === 1 ? '' : 's'}</span>
                        {item.key === ALL_COLLECTIONS_KEY && <span>· includes only selected collections</span>}
                      </div>
                    </div>
                    <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border shrink-0 ${
                      visible ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'
                    }`}>
                      {visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {visible ? 'Visible' : 'Hidden'}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer / Save */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs text-gray-500">
            <b className="text-gray-800">{visibleCount}</b> of {items.length} visible to buyers
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
