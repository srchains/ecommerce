import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Plus, X, Check, Trash2, AlertCircle, ChevronDown, ChevronUp, FolderPlus, Image as ImageIcon, Video, Play } from 'lucide-react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import { API_BASE_URL } from '../context/AppContext';

interface MediaSlot {
  url: string;        // blob URL for preview OR uploaded URL
  file_name: string;
  file_type: string;
  file_size: string;
  category: string;
  isUploading?: boolean;
  isLocal?: boolean;  // true if only selected locally, not yet persisted
}

interface ProductVariantData {
  variant_code: string;
  variant_name: string;
  status: string;
  sizes: {
    size: number;
    weight: number;
    stock_available: number;
    moq: number;
    status: string;
  }[];
  media: MediaSlot[];
}

interface ProductFormData {
  design_code: string;
  name: string;
  category_id: number | null;
  collection: string;
  tags: string;
  purity: number;
  making_charge_per_gram: number;
  wastage_percent: number;
  gst_percent: number;
  moq: number;
  price_lock_minutes: number;
  status: string;
  metal: string;
  weight_range: string;
  finishing: string;
  occasion: string;
  style: string;
  gender: string;
  lock_type: string;
  returnable: boolean;
  exchangeable: boolean;
  variants: ProductVariantData[];
  media: MediaSlot[];
}

const DEFAULT_SIZES = [
  { size: 5.0, weight: 20.56 }, { size: 5.5, weight: 22.61 },
  { size: 6.0, weight: 24.67 }, { size: 6.5, weight: 26.72 }, { size: 7.0, weight: 28.78 },
  { size: 7.5, weight: 30.83 }, { size: 8.0, weight: 32.89 }, { size: 8.5, weight: 34.94 },
  { size: 9.0, weight: 37.0 },  { size: 9.5, weight: 39.06 }, { size: 10.0, weight: 41.11 },
  { size: 10.5, weight: 43.17 },{ size: 11.0, weight: 45.22 },
];

const emptyVariant = (): ProductVariantData => ({
  variant_code: '',
  variant_name: '',
  status: 'Active',
  sizes: DEFAULT_SIZES.map(s => ({ ...s, stock_available: 0, moq: 10, status: 'Active' })),
  media: [],
});

const initialFormData = (): ProductFormData => ({
  design_code: '',
  name: '',
  category_id: null,
  collection: 'New Arrival',
  tags: '',
  purity: 92.5,
  making_charge_per_gram: 20.0,
  wastage_percent: 10.0,
  gst_percent: 3.0,
  moq: 10,
  price_lock_minutes: 10,
  status: 'Active',
  metal: 'Silver 925',
  weight_range: '',
  finishing: 'High Polish',
  occasion: 'Daily Wear',
  style: '',
  gender: 'Women',
  lock_type: 'S-Hook',
  returnable: true,
  exchangeable: true,
  variants: [emptyVariant()],
  media: [],
});

interface ProductFormProps {
  editingCode?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// ── Media Upload Grid ─────────────────────────────────────────────────────
const MediaUploadGrid: React.FC<{
  slots: MediaSlot[];
  maxImages: number;
  maxVideos: number;
  designCode: string;
  variantCode?: string;
  onChange: (slots: MediaSlot[]) => void;
}> = ({ slots, maxImages, maxVideos, designCode, variantCode, onChange }) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);


  const images = slots.filter(s => s.file_type.startsWith('image'));
  const videos = slots.filter(s => s.file_type.startsWith('video'));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = useCallback(async (files: FileList | null, type: 'image' | 'video') => {
    if (!files) return;
    const currentOfType = slots.filter(s => s.file_type.startsWith(type));
    const maxAllowed = type === 'image' ? maxImages : maxVideos;
    const remaining = maxAllowed - currentOfType.length;
    const toAdd = Array.from(files).slice(0, remaining);
    if (toAdd.length === 0) return;

    // Create preview blobs immediately
    const newSlots: MediaSlot[] = toAdd.map(f => ({
      url: URL.createObjectURL(f),
      file_name: f.name,
      file_type: f.type,
      file_size: formatSize(f.size),
      category: type === 'image' ? 'Catalog Photos' : 'Product Videos',
      isUploading: !!designCode,
      isLocal: true,
    }));

    // Add previews to state immediately
    const initialSlots = [...slots, ...newSlots];
    onChange(initialSlots);

    // Upload each file to backend if design_code is available
    if (designCode) {
      let currentSlots = [...initialSlots];
      
      for (let i = 0; i < toAdd.length; i++) {
        const file = toAdd[i];
        const localSlot = newSlots[i];
        
        try {
          const formData = new FormData();
          formData.append('design_code', designCode);
          if (variantCode) {
            formData.append('variant_code', variantCode);
          }
          formData.append('category', localSlot.category);
          formData.append('file', file);
          
          const res = await axios.post(`${API_BASE_URL}/api/media/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          // Update the slot in the list with the server URL
          currentSlots = currentSlots.map(s => 
            s.url === localSlot.url 
              ? { ...s, url: res.data.url, isUploading: false, isLocal: false }
              : s
          );
        } catch (err) {
          console.error('Failed to upload file:', file.name, err);
          // Keep local preview but mark as not uploading
          currentSlots = currentSlots.map(s => 
            s.url === localSlot.url 
              ? { ...s, isUploading: false, isLocal: true }
              : s
          );
        }
        onChange(currentSlots);
      }
    }
  }, [slots, maxImages, maxVideos, designCode, variantCode, onChange]);

  // ── Paste handler: capture Ctrl+V images from clipboard ──────────────────
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          // Give the pasted blob a meaningful name
          const ext = item.type.split('/')[1] || 'png';
          const named = new File([file], `pasted-image-${Date.now()}.${ext}`, { type: item.type });
          imageFiles.push(named);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      const dt = new DataTransfer();
      imageFiles.forEach(f => dt.items.add(f));
      handleFileSelect(dt.files, 'image');
    }
  }, [handleFileSelect]);

  useEffect(() => {
    // Listen on document so paste works even when a text input is focused
    document.addEventListener('paste', handlePaste as EventListener);
    return () => document.removeEventListener('paste', handlePaste as EventListener);
  }, [handlePaste]);

  const removeSlot = (url: string) => {
    onChange(slots.filter(s => s.url !== url));
  };

  const renderSlot = (slot: MediaSlot | null, idx: number, type: 'image' | 'video') => {
    const isEmpty = !slot;
    const isImg = type === 'image';
    return (
      <div
        key={idx}
        onClick={() => {
          if (isEmpty) {
            if (type === 'image') imageInputRef.current?.click();
            else videoInputRef.current?.click();
          }
        }}
        className={`relative group rounded-xl border-2 overflow-hidden flex items-center justify-center transition-all ${
          isEmpty
            ? 'border-dashed border-gray-200 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 cursor-pointer'
            : 'border-solid border-gray-200 bg-gray-100'
        }`}

        style={{ aspectRatio: isImg ? '1/1' : '16/9', minHeight: isImg ? 100 : 80 }}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-gray-600 transition-colors select-none">
            {isImg
              ? <ImageIcon className="h-6 w-6" />
              : <Video className="h-6 w-6" />}
            <span className="text-[10px] font-semibold uppercase tracking-wide">{isImg ? 'Add Photo' : 'Add Video'}</span>
          </div>
        ) : (
          <>
            {isImg ? (
              <img
                src={slot.url}
                alt={slot.file_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // If the URL is broken, show a grey placeholder instead of alt text
                  const t = e.currentTarget;
                  t.style.display = 'none';
                  const parent = t.parentElement;
                  if (parent && !parent.querySelector('.img-error-placeholder')) {
                    const ph = document.createElement('div');
                    ph.className = 'img-error-placeholder w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400 bg-gray-100';
                    ph.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">${slot.file_name}</span>`;
                    parent.appendChild(ph);
                  }
                }}
              />
            ) : (
              <div className="w-full h-full relative bg-black">
                <video src={slot.url} className="w-full h-full object-contain" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="h-8 w-8 text-white/80" />
                </div>
              </div>
            )}
            {slot.isUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {slot.isLocal && !slot.isUploading && (
              <span className="absolute bottom-1 left-1 text-[9px] bg-yellow-500 text-white px-1 rounded">Local</span>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeSlot(slot.url); }}
              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-sm cursor-pointer z-10 transition-all"
              title="Delete media"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    );
  };

  // Build image slots array (fill up to maxImages)
  const imageSlots: (MediaSlot | null)[] = Array.from({ length: maxImages }, (_, i) => images[i] || null);
  const videoSlots: (MediaSlot | null)[] = Array.from({ length: maxVideos }, (_, i) => videos[i] || null);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="space-y-4 outline-none"
      title="Click here, then paste (Ctrl+V) to add an image"
    >
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { handleFileSelect(e.target.files, 'image'); e.target.value = ''; }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={e => { handleFileSelect(e.target.files, 'video'); e.target.value = ''; }}
      />

      {/* Images row */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" />
          Photos ({images.length}/{maxImages}) — click a slot to add
        </p>
        <div className="grid grid-cols-4 gap-3">
          {imageSlots.map((slot, i) => renderSlot(slot, i, 'image'))}
        </div>
      </div>

      {/* Videos row */}
      {maxVideos > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5" />
            Videos ({videos.length}/{maxVideos}) — click a slot to add
          </p>
          <div className="grid grid-cols-4 gap-3">
            {videoSlots.map((slot, i) => renderSlot(slot, i, 'video'))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Collapsible Section Component ──────────────────────────────────────────
const Section: React.FC<{ title: string; subtitle?: string; defaultOpen?: boolean; children: React.ReactNode }> = ({
  title, subtitle, defaultOpen = true, children
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="enterprise-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <div>
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{title}</h4>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>
      {open && <div className="px-5 pb-6 space-y-5 border-t border-gray-100">{children}</div>}
    </div>
  );
};

// ── Inline Category Creator ────────────────────────────────────────────────
const InlineCategoryAdder: React.FC<{
  categories: { id: number; name: string; parent_id: number | null }[];
  onCreated: (id: number) => void;
  fetchCategories: () => Promise<void>;
}> = ({ categories, onCreated, fetchCategories }) => {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handle = async () => {
    if (!newName.trim()) { setErr('Enter a name'); return; }
    try {
      setSaving(true);
      setErr('');
      const res = await axios.post(`${API_BASE_URL}/api/products/categories`, {
        name: newName.trim(),
        parent_id: parentId,
      });
      await fetchCategories();
      onCreated(res.data.id);
      setNewName('');
      setParentId(null);
      setOpen(false);
    } catch (e: any) {
      setErr(e.response?.data?.detail || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  // Build tree for display
  const roots = categories.filter(c => c.parent_id === null);
  const getChildren = (pid: number) => categories.filter(c => c.parent_id === pid);

  return (
    <div className="mt-2">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          <FolderPlus className="h-3.5 w-3.5" />
          Create new category
        </button>
      ) : (
        <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">New Category</span>
            <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={newName}
              onChange={e => { setNewName(e.target.value); setErr(''); }}
              placeholder="Category name (e.g. Temple Anklets)"
              className="input text-sm py-2"
              autoFocus
            />

            <select
              value={parentId ?? ''}
              onChange={e => setParentId(e.target.value ? Number(e.target.value) : null)}
              className="select text-sm py-2"
            >
              <option value="">— Root Category (no parent) —</option>
              {roots.map(root => (
                <React.Fragment key={root.id}>
                  <option value={root.id}>{root.name}</option>
                  {getChildren(root.id).map(child => (
                    <option key={child.id} value={child.id}>　└ {child.name}</option>
                  ))}
                </React.Fragment>
              ))}
            </select>

            {err && <p className="text-xs text-red-600">{err}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handle}
                disabled={saving}
                className="btn-primary text-xs py-1.5 px-3"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{saving ? 'Creating...' : 'Create'}</span>
              </button>
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-xs py-1.5 px-3">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Product Form ──────────────────────────────────────────────────────
export const ProductForm: React.FC<ProductFormProps> = ({ editingCode, onSuccess, onCancel }) => {
  const { categories, fetchDesigns, fetchCategories } = useApp();
  const [formData, setFormData] = useState<ProductFormData>(initialFormData());
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [expandedVariants, setExpandedVariants] = useState<Set<number>>(new Set([0]));
  const [isRenamingCat, setIsRenamingCat] = useState(false);
  const [renamingCatName, setRenamingCatName] = useState('');

  const startRenameCategory = (catId: number | null) => {
    if (!catId) return;
    const cat = categories.find(c => c.id === catId);
    if (cat) {
      setRenamingCatName(cat.name);
      setIsRenamingCat(true);
    }
  };

  const handleSaveRenameCategory = async () => {
    if (!formData.category_id || !renamingCatName.trim()) return;
    try {
      const cat = categories.find(c => c.id === formData.category_id);
      await axios.put(`${API_BASE_URL}/api/products/categories/${formData.category_id}`, {
        name: renamingCatName.trim(),
        parent_id: cat ? cat.parent_id : null
      });
      await fetchCategories();
      setIsRenamingCat(false);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to rename category');
    }
  };

  const handleDeleteCategory = async (catId: number | null) => {
    if (!catId) return;
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    if (!confirm(`Are you sure you want to completely delete category "${cat.name}"? Products assigned to it will become uncategorized.`)) {
      return;
    }
    try {
      await axios.delete(`${API_BASE_URL}/api/products/categories/${catId}`);
      upd('category_id', null);
      await fetchCategories();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to delete category');
    }
  };

  useEffect(() => {
    if (editingCode) {
      axios.get(`${API_BASE_URL}/api/products/designs/${editingCode}`)
        .then(res => {
          const d = res.data;
          setFormData({
            design_code: d.design_code,
            name: d.name,
            category_id: d.category_id,
            collection: d.collection || '',
            tags: d.tags || '',
            purity: d.purity,
            making_charge_per_gram: d.making_charge_per_gram,
            wastage_percent: d.wastage_percent,
            gst_percent: d.gst_percent,
            moq: d.moq,
            price_lock_minutes: d.price_lock_minutes,
            status: d.status,
            metal: d.metal,
            weight_range: d.weight_range || '',
            finishing: d.finishing,
            occasion: d.occasion,
            style: d.style || '',
            gender: d.gender,
            lock_type: d.lock_type,
            returnable: d.returnable,
            exchangeable: d.exchangeable,
            variants: d.variants.map((v: any) => ({
              variant_code: v.variant_code,
              variant_name: v.variant_name,
              status: v.status,
              sizes: v.sizes.map((s: any) => ({
                size: s.size, weight: s.weight,
                stock_available: s.stock_available, moq: s.moq, status: s.status,
              })),
              media: (v.media || []).map((m: any) => ({
                file_name: m.file_name, file_type: m.file_type,
                file_size: m.file_size, url: m.url, category: m.category,
              })),
            })),
            media: (d.media || [])
              .filter((m: any) => !m.variant_id)
              .map((m: any) => ({
                file_name: m.file_name, file_type: m.file_type,
                file_size: m.file_size, url: m.url, category: m.category,
              })),
          });
          setExpandedVariants(new Set(d.variants.map((_: any, i: number) => i)));
        })
        .catch(() => setErrors(['Failed to load design data']));
    } else {
      setFormData(initialFormData());
      setErrors([]);
      setExpandedVariants(new Set([0]));
    }
  }, [editingCode]);

  const upd = <K extends keyof ProductFormData>(f: K, v: ProductFormData[K]) => {
    setFormData(p => ({ ...p, [f]: v }));
    setErrors([]);
  };

  const updVariant = (idx: number, field: keyof ProductVariantData, value: any) => {
    setFormData(p => {
      const variants = [...p.variants];
      variants[idx] = { ...variants[idx], [field]: value } as ProductVariantData;
      return { ...p, variants };
    });
  };

  const updSize = (vIdx: number, sIdx: number, field: string, value: any) => {
    setFormData(p => {
      const variants = [...p.variants];
      const sizes = [...variants[vIdx].sizes];
      (sizes[sIdx] as any)[field] = value;
      variants[vIdx] = { ...variants[vIdx], sizes };
      return { ...p, variants };
    });
  };

  const addVariant = () => {
    const idx = formData.variants.length;
    setFormData(p => ({ ...p, variants: [...p.variants, emptyVariant()] }));
    setExpandedVariants(prev => new Set([...prev, idx]));
  };

  const removeVariant = (idx: number) => {
    if (formData.variants.length === 1) { alert('At least one variant required'); return; }
    setFormData(p => ({ ...p, variants: p.variants.filter((_, i) => i !== idx) }));
    setExpandedVariants(prev => { const s = new Set(prev); s.delete(idx); return s; });
  };

  const toggleVariant = (idx: number) => {
    setExpandedVariants(prev => {
      const s = new Set(prev);
      s.has(idx) ? s.delete(idx) : s.add(idx);
      return s;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    if (!formData.design_code.trim() || !formData.name.trim()) {
      setErrors(['Design Code and Design Name are required']);
      return;
    }
    if (!formData.category_id) {
      setErrors(['Please select a Category. Products without a category will not appear in the buyer catalog filters.']);
      return;
    }
    const bad = formData.variants.find(v => !v.variant_code.trim() || !v.variant_name.trim());
    if (bad) { setErrors(['Every variant needs a Variant Code and Name']); return; }

    try {
      setSubmitting(true);
      if (editingCode) {
        const res = await axios.get(`${API_BASE_URL}/api/products/designs/${editingCode}`);
        await axios.put(`${API_BASE_URL}/api/products/designs/${res.data.id}`, formData);
      } else {
        await axios.post(`${API_BASE_URL}/api/products/designs`, formData);
      }
      await fetchDesigns('');
      onSuccess();
    } catch (err: any) {
      setErrors([err.response?.data?.detail || 'Failed to save product']);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingCode) return;
    if (!confirm('Are you sure you want to completely delete this product design? This action cannot be undone.')) return;
    try {
      setSubmitting(true);
      const res = await axios.get(`${API_BASE_URL}/api/products/designs/${editingCode}`);
      await axios.delete(`${API_BASE_URL}/api/products/designs/${res.data.id}`);
      await fetchDesigns('');
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete product');
    } finally {
      setSubmitting(false);
    }
  };

  // Build category tree for dropdown
  const roots = categories.filter(c => c.parent_id === null);
  const getChildren = (pid: number) => categories.filter(c => c.parent_id === pid);

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <button type="button" onClick={onCancel}
            className="flex items-center space-x-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-wider">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
          <h2 className="page-title">{editingCode ? 'Edit Product' : 'Add New Product'}</h2>
          <p className="muted-text text-sm">Fill in the details below — each section can be collapsed.</p>
        </div>
        <div className="flex items-center gap-3">
          {editingCode && (
            <button type="button" onClick={handleDelete} disabled={submitting}
              className="btn-secondary border-red-200 text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          )}
          <button type="submit" disabled={submitting} className="btn-primary">
            <Check className="h-4 w-4" />
            <span>{submitting ? 'Saving...' : editingCode ? 'Update Product' : 'Create Product'}</span>
          </button>
        </div>
      </div>

      {/* ── Errors ── */}
      {errors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>{errors.map((e, i) => <p key={i}>{e}</p>)}</div>
        </div>
      )}

      {/* ══ SECTION 1: Basic Info ══════════════════════════════════════════ */}
      <Section title="Basic Info" subtitle="Design code, name, category and collection" defaultOpen={true}>
        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="field-label">Design Code <span className="text-red-500">*</span></label>
            <input type="text" value={formData.design_code}
              onChange={e => upd('design_code', e.target.value)}
              placeholder="e.g. ANK-1027" className="input" />
            <p className="text-xs text-gray-400">Design code can be shared across multiple designs (not unique).</p>
          </div>
          <div className="space-y-1">
            <label className="field-label">Design Name <span className="text-red-500">*</span></label>
            <input type="text" value={formData.name}
              onChange={e => upd('name', e.target.value)}
              placeholder="e.g. Traditional Royal Anklet" className="input" />
            <p className="text-xs text-gray-400">Design name must be unique across all designs.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Category with full tree dropdown + inline creator */}
          <div className="space-y-1 md:col-span-1">
            <div className="flex justify-between items-center">
              <label className="field-label mb-0">Category <span className="text-red-500">*</span></label>
              {formData.category_id && !isRenamingCat && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <button
                    type="button"
                    onClick={() => startRenameCategory(formData.category_id)}
                    className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                  >
                    Rename
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(formData.category_id)}
                    className="text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {isRenamingCat ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={renamingCatName}
                  onChange={e => setRenamingCatName(e.target.value)}
                  className="input text-sm py-1.5"
                  placeholder="Category Name"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveRenameCategory}
                  className="btn-primary text-xs px-2.5 py-1.5"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsRenamingCat(false)}
                  className="btn-secondary text-xs px-2.5 py-1.5"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <select value={formData.category_id ?? ''}
                  onChange={e => upd('category_id', e.target.value ? Number(e.target.value) : null)}
                  className={`select ${!formData.category_id ? 'border-red-300 bg-red-50' : ''}`}>
                  <option value="">— Select Category (Required) —</option>
                  {roots.map(root => (
                    <React.Fragment key={root.id}>
                      <option value={root.id}>{root.name}</option>
                      {getChildren(root.id).map(child => (
                        <React.Fragment key={child.id}>
                          <option value={child.id}>　└ {child.name}</option>
                          {getChildren(child.id).map(grand => (
                            <option key={grand.id} value={grand.id}>　　└ {grand.name}</option>
                          ))}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </select>
                <InlineCategoryAdder
                  categories={categories}
                  fetchCategories={fetchCategories}
                  onCreated={(id) => upd('category_id', id)}
                />
              </>
            )}
          </div>

          <div className="space-y-1">
            <label className="field-label">Collection</label>
            <input type="text" value={formData.collection}
              onChange={e => upd('collection', e.target.value)}
              placeholder="e.g. New Arrival, Bridal" className="input" />
          </div>

          <div className="space-y-1">
            <label className="field-label">Status</label>
            <select value={formData.status} onChange={e => upd('status', e.target.value)} className="select">
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="field-label">Tags <span className="text-gray-400 font-normal">(comma separated)</span></label>
          <input type="text" value={formData.tags}
            onChange={e => upd('tags', e.target.value)}
            placeholder="floral, bell, dailywear, silver925" className="input" />
        </div>
      </Section>

      {/* ══ SECTION 2: Pricing & Specs ════════════════════════════════════ */}
      <Section title="Pricing & Specifications" subtitle="Metal purity, making charges, GST, specs" defaultOpen={true}>
        <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="field-label">Purity</label>
            <input type="number" step="0.1" value={formData.purity}
              onChange={e => upd('purity', parseFloat(e.target.value))} className="input" />
          </div>
          <div className="space-y-1">
            <label className="field-label">Making ₹/g</label>
            <input type="number" step="0.5" value={formData.making_charge_per_gram}
              onChange={e => upd('making_charge_per_gram', parseFloat(e.target.value))} className="input" />
          </div>
          <div className="space-y-1">
            <label className="field-label">Wastage %</label>
            <input type="number" step="0.1" value={formData.wastage_percent}
              onChange={e => upd('wastage_percent', parseFloat(e.target.value))} className="input" />
          </div>
          <div className="space-y-1">
            <label className="field-label">GST %</label>
            <input type="number" step="0.1" value={formData.gst_percent}
              onChange={e => upd('gst_percent', parseFloat(e.target.value))} className="input" />
          </div>
          <div className="space-y-1">
            <label className="field-label">MOQ (pcs)</label>
            <input type="number" value={formData.moq}
              onChange={e => upd('moq', parseInt(e.target.value))} className="input" />
          </div>
          <div className="space-y-1">
            <label className="field-label">Price Lock (min)</label>
            <input type="number" value={formData.price_lock_minutes}
              onChange={e => upd('price_lock_minutes', parseInt(e.target.value))} className="input" />
          </div>
          <div className="space-y-1">
            <label className="field-label">Metal</label>
            <input type="text" value={formData.metal}
              onChange={e => upd('metal', e.target.value)} className="input" />
          </div>
          <div className="space-y-1">
            <label className="field-label">Weight Range</label>
            <input type="text" value={formData.weight_range}
              onChange={e => upd('weight_range', e.target.value)}
              placeholder="e.g. 18.5 - 24.3 gm" className="input" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="field-label">Finishing</label>
            <input type="text" value={formData.finishing}
              onChange={e => upd('finishing', e.target.value)} className="input" />
          </div>
          <div className="space-y-1">
            <label className="field-label">Occasion</label>
            <input type="text" value={formData.occasion}
              onChange={e => upd('occasion', e.target.value)} className="input" />
          </div>
          <div className="space-y-1">
            <label className="field-label">Style</label>
            <input type="text" value={formData.style}
              onChange={e => upd('style', e.target.value)} className="input" />
          </div>
          <div className="space-y-1">
            <label className="field-label">Gender</label>
            <select value={formData.gender} onChange={e => upd('gender', e.target.value)} className="select">
              <option value="Women">Women</option>
              <option value="Men">Men</option>
              <option value="Kids">Kids</option>
              <option value="Unisex">Unisex</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="field-label">Lock Type</label>
            <input type="text" value={formData.lock_type}
              onChange={e => upd('lock_type', e.target.value)} className="input" />
          </div>
          <div className="space-y-1">
            <label className="field-label">Returnable</label>
            <select value={formData.returnable ? 'true' : 'false'}
              onChange={e => upd('returnable', e.target.value === 'true')} className="select">
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="field-label">Exchangeable</label>
            <select value={formData.exchangeable ? 'true' : 'false'}
              onChange={e => upd('exchangeable', e.target.value === 'true')} className="select">
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      </Section>

      {/* ══ SECTION 2b: Product Media ════════════════════════════════════ */}
      <Section title="Product Media" subtitle="1 catalog photo for this design" defaultOpen={true}>
        <div className="pt-4">
          <MediaUploadGrid
            slots={formData.media}
            maxImages={1}
            maxVideos={0}
            designCode={formData.design_code}
            onChange={(slots) => upd('media', slots)}
          />
          {!formData.design_code && (
            <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Enter a Design Code above to enable server upload. Photos will be previewed locally until saved.
            </p>
          )}
        </div>
      </Section>

      {/* ══ SECTION 3: Variants ═══════════════════════════════════════════ */}
      <div className="enterprise-panel overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <div>
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Variants & Sizes</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              {formData.variants.length} variant{formData.variants.length !== 1 ? 's' : ''} — each can have its own stock & weight matrix
            </p>
          </div>
          <button type="button" onClick={addVariant} className="btn-secondary">
            <Plus className="h-4 w-4" />
            <span>Add Variant</span>
          </button>
        </div>

        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {formData.variants.map((variant, vIdx) => {
            const isExpanded = expandedVariants.has(vIdx);
            const totalStock = variant.sizes.reduce((s, sz) => s + sz.stock_available, 0);

            return (
              <div key={vIdx}>
                {/* Variant Header (always visible) */}
                <div className="flex items-center gap-3 px-5 py-3 bg-gray-50/60">
                  <button type="button" onClick={() => toggleVariant(vIdx)}
                    className="flex-1 flex items-center gap-3 text-left">
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-gray-900 text-sm">
                        {variant.variant_name || `Variant ${vIdx + 1}`}
                      </span>
                      {variant.variant_code && (
                        <span className="ml-2 text-xs font-mono text-gray-500">{variant.variant_code}</span>
                      )}
                      <span className="ml-3 text-xs text-gray-400">
                        Stock: {totalStock} pcs | {variant.sizes.length} sizes
                      </span>
                    </div>
                  </button>
                  <button type="button" onClick={() => removeVariant(vIdx)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Variant Detail (collapsible) */}
                {isExpanded && (
                  <div className="px-5 py-4 space-y-4">
                    {/* Variant fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="field-label">Variant Code <span className="text-red-500">*</span></label>
                        <input type="text" value={variant.variant_code}
                          onChange={e => updVariant(vIdx, 'variant_code', e.target.value)}
                          placeholder="e.g. ANK-1025-WHT" className="input" />
                      </div>
                      <div className="space-y-1">
                        <label className="field-label">Variant Name <span className="text-red-500">*</span></label>
                        <input type="text" value={variant.variant_name}
                          onChange={e => updVariant(vIdx, 'variant_name', e.target.value)}
                          placeholder="e.g. White Stone" className="input" />
                      </div>
                      <div className="space-y-1">
                        <label className="field-label">Status</label>
                        <select value={variant.status}
                          onChange={e => updVariant(vIdx, 'status', e.target.value)} className="select">
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>

                    {/* Size Matrix */}
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Size Matrix — update stock & weight per size
                      </p>
                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="enterprise-table">
                          <thead>
                            <tr>
                              <th className="w-20">Size (in)</th>
                              <th>Weight (g)</th>
                              <th>Stock</th>
                              <th>MOQ</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {variant.sizes.map((size, sIdx) => (
                              <tr key={sIdx} className={size.stock_available > 0 ? 'bg-green-50/30' : ''}>
                                <td className="font-mono font-semibold text-gray-900">{size.size.toFixed(2)}</td>
                                <td>
                                  <input type="number" step="0.01" value={size.weight}
                                    onChange={e => updSize(vIdx, sIdx, 'weight', parseFloat(e.target.value) || 0)}
                                    className="input w-24 py-1.5 text-center" />
                                </td>
                                <td>
                                  <input type="number" value={size.stock_available}
                                    onChange={e => updSize(vIdx, sIdx, 'stock_available', parseInt(e.target.value) || 0)}
                                    className="input w-20 py-1.5 text-center" />
                                </td>
                                <td>
                                  <input type="number" value={size.moq}
                                    onChange={e => updSize(vIdx, sIdx, 'moq', parseInt(e.target.value) || 0)}
                                    className="input w-20 py-1.5 text-center" />
                                </td>
                                <td>
                                  <select value={size.status}
                                    onChange={e => updSize(vIdx, sIdx, 'status', e.target.value)}
                                    className="select w-28 py-1.5 text-xs">
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Variant Media */}
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Variant Photos & Videos</p>
                      <MediaUploadGrid
                        slots={variant.media || []}
                        maxImages={4}
                        maxVideos={2}
                        designCode={formData.design_code}
                        variantCode={variant.variant_code}
                        onChange={(slots) => updVariant(vIdx, 'media', slots)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom Save bar ── */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-200 px-0 py-4 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={submitting} className="btn-primary">
          <Check className="h-4 w-4" />
          <span>{submitting ? 'Saving...' : editingCode ? 'Update Product' : 'Create Product'}</span>
        </button>
      </div>
    </form>
  );
};
