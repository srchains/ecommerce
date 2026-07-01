import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Check, ChevronRight, Edit3, Plus, Trash2, X } from 'lucide-react';
import { API_BASE_URL, useApp } from '../context/AppContext';

export const CategoryManagement: React.FC = () => {
  const { categories, fetchCategories } = useApp();

  // ── Add form state ──────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  // ── Inline edit state (one row at a time) ──────────────────────────────────
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingParentId, setEditingParentId] = useState<number | null>(null);
  const [rowSaving, setRowSaving] = useState(false);

  // ── Feedback ───────────────────────────────────────────────────────────────
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId !== null && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingId]);

  const showMessage = (text: string) => {
    setMessage(text);
    setError('');
    setTimeout(() => setMessage(''), 3000);
  };

  const showError = (text: string) => {
    setError(text);
    setMessage('');
    setTimeout(() => setError(''), 4000);
  };

  // ── Create ─────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { showError('Category name is required'); return; }
    try {
      setFormSaving(true);
      await axios.post(`${API_BASE_URL}/api/products/categories`, {
        name: name.trim(),
        parent_id: parentId,
      });
      setName('');
      setParentId(null);
      await fetchCategories();
      showMessage('Category added successfully');
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Failed to add category');
    } finally {
      setFormSaving(false);
    }
  };

  // ── Inline edit start ──────────────────────────────────────────────────────
  const startEdit = (categoryId: number) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    setEditingId(cat.id);
    setEditingName(cat.name);
    setEditingParentId(cat.parent_id);
    setError('');
    setMessage('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingParentId(null);
  };

  // ── Save inline edit ───────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!editingId || !editingName.trim()) { showError('Category name cannot be empty'); return; }
    try {
      setRowSaving(true);
      await axios.put(`${API_BASE_URL}/api/products/categories/${editingId}`, {
        name: editingName.trim(),
        parent_id: editingParentId,
      });
      cancelEdit();
      await fetchCategories();
      showMessage('Category renamed successfully');
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Failed to save changes');
    } finally {
      setRowSaving(false);
    }
  };

  // Save on Enter key inside the name input
  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleUpdate();
    if (e.key === 'Escape') cancelEdit();
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (categoryId: number) => {
    if (!confirm('Delete this category? Products using it must be re-assigned first.')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/products/categories/${categoryId}`);
      await fetchCategories();
      showMessage('Category deleted');
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Failed to delete category');
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const parentName = (pid: number | null) => {
    if (!pid) return 'Root Category';
    return categories.find(c => c.id === pid)?.name || 'Root Category';
  };

  const parentOptions = categories.filter(c => c.id !== editingId);

  // Organize for display: roots first, then children under their parent
  const roots = categories.filter(c => c.parent_id === null);
  const getChildren = (pid: number) => categories.filter(c => c.parent_id === pid);

  const orderedCategories: typeof categories = [];
  roots.forEach(root => {
    orderedCategories.push(root);
    getChildren(root.id).forEach(child => orderedCategories.push(child));
  });
  // also add any orphan subcategories not under a known root
  categories.forEach(c => {
    if (!orderedCategories.find(o => o.id === c.id)) orderedCategories.push(c);
  });

  return (
    <div className="space-y-6 pb-12">

      {/* ── Page header ── */}
      <div className="section-header">
        <div>
          <h2 className="page-title">Categories</h2>
          <p className="muted-text text-sm mt-2">
            Click any category name in the list below to rename it instantly.
          </p>
        </div>
        <span className="badge-neutral">{categories.length} Categories</span>
      </div>

      {/* ── Add new category form ── */}
      <form onSubmit={handleCreate} className="enterprise-panel p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h3 className="card-title">Add New Category</h3>
            <p className="text-sm text-gray-500 mt-1">
              Create a root (top-level) category or nest it under an existing one.
            </p>
          </div>
          <button type="submit" disabled={formSaving} className="btn-primary">
            <Plus className="h-4 w-4" />
            <span>{formSaving ? 'Saving...' : 'Add Category'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label className="field-label">Category Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Temple Anklets"
              className="input"
            />
          </div>
          <div className="space-y-1">
            <label className="field-label">Parent Category</label>
            <select
              value={parentId ?? ''}
              onChange={e => setParentId(e.target.value ? Number(e.target.value) : null)}
              className="select"
            >
              <option value="">— Root Category (no parent) —</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
      </form>

      {/* ── Feedback banner ── */}
      {(message || error) && (
        <div className={`p-3 rounded-lg text-sm flex items-center space-x-2 font-medium ${
          error
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {error ? <X className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0" />}
          <span>{error || message}</span>
        </div>
      )}

      {/* ── Category list ── */}
      <div className="enterprise-panel overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="card-title">Category List</h3>
            <p className="text-sm text-gray-500 mt-1">
              <span className="inline-flex items-center gap-1 text-gray-400">
                <Edit3 className="h-3.5 w-3.5" />
              </span>
              {' '}Click the pencil icon or the name itself to rename any category.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th style={{ width: '36%' }}>Category Name <span className="text-gray-400 font-normal normal-case tracking-normal">(click to rename)</span></th>
                <th style={{ width: '28%' }}>Parent Category <span className="text-gray-400 font-normal normal-case tracking-normal">(editable)</span></th>
                <th className="text-center" style={{ width: '14%' }}>Type</th>
                <th className="text-right" style={{ width: '22%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orderedCategories.map(category => {
                const isEditing = editingId === category.id;
                const isChild = category.parent_id !== null;

                return (
                  <tr key={category.id} className={isEditing ? 'bg-blue-50/40' : ''}>

                    {/* ── Category Name cell ── */}
                    <td>
                      {isEditing ? (
                        <input
                          ref={nameInputRef}
                          type="text"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={handleNameKeyDown}
                          placeholder="Category name"
                          className="input py-1.5 text-sm font-semibold"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(category.id)}
                          className={`group flex items-center gap-2 text-left w-full rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-100 cursor-pointer ${
                            isChild ? 'pl-5 text-gray-700' : 'text-gray-900 font-semibold'
                          }`}
                        >
                          {isChild && (
                            <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          )}
                          <span className={isChild ? 'text-sm' : ''}>{category.name}</span>
                          <Edit3 className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto" />
                        </button>
                      )}
                    </td>

                    {/* ── Parent cell ── */}
                    <td>
                      {isEditing ? (
                        <select
                          value={editingParentId ?? ''}
                          onChange={e => setEditingParentId(e.target.value ? Number(e.target.value) : null)}
                          className="select py-1.5 text-sm"
                        >
                          <option value="">— Root Category —</option>
                          {parentOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(category.id)}
                          className="group flex items-center gap-1.5 text-left rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-100 cursor-pointer w-full"
                        >
                          <span className="text-sm text-gray-600">{parentName(category.parent_id)}</span>
                          <Edit3 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
                        </button>
                      )}
                    </td>

                    {/* ── Type badge ── */}
                    <td className="text-center">
                      <span className={isChild ? 'badge-info' : 'badge-neutral'}>
                        {isChild ? 'Sub-category' : 'Root'}
                      </span>
                    </td>

                    {/* ── Actions ── */}
                    <td className="text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleUpdate}
                            disabled={rowSaving}
                            className="btn-primary px-3 py-1.5 text-xs"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>{rowSaving ? 'Saving…' : 'Save'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="btn-secondary px-3 py-1.5 text-xs"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(category.id)}
                            className="btn-secondary px-3 py-1.5 text-xs"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Rename</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(category.id)}
                            className="btn-secondary px-3 py-1.5 text-xs border-red-200 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-400 text-sm">
                    No categories yet. Add your first category above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
