import { useState, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiPlus, FiX, FiCheck } from 'react-icons/fi';
import { categoryAPI } from '../../services/api';
import Spinner from '../common/Spinner';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name: '', description: '', icon: '' };

export default function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchCategories = () => {
    setLoading(true);
    categoryAPI.getAll()
      .then((r) => setCategories([...r.data].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchCategories, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description || '', icon: cat.icon || '' });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Category name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await categoryAPI.update(editing._id, form);
        toast.success('Category updated');
      } else {
        await categoryAPI.create(form);
        toast.success('Category added');
      }
      closeForm();
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!confirm(`Delete category "${cat.name}"? Products in this category will be uncategorized.`)) return;
    try {
      await categoryAPI.remove(cat._id);
      toast.success('Category deleted');
      setCategories((prev) => prev.filter((c) => c._id !== cat._id));
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Categories</h1>
        <button onClick={openAdd} className="btn-primary text-sm py-1.5 flex items-center gap-1">
          <FiPlus size={14} /> Add Category
        </button>
      </div>

      {showForm && (
        <div className="card p-5 mb-5 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">{editing ? 'Edit Category' : 'New Category'}</h3>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><FiX size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input" placeholder="e.g. Business Cards" autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Icon (emoji)</label>
              <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="input" placeholder="e.g. 🖨️" maxLength={4} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1">
              <FiCheck size={14} /> {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Category'}
            </button>
            <button onClick={closeForm} className="btn-outline">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : categories.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🗂️</p>
          <p className="mb-4">No categories yet</p>
          <button onClick={openAdd} className="btn-primary text-sm">Add your first category</button>
        </div>
      ) : (
        <div className="card divide-y">
          {categories.map((cat) => (
            <div key={cat._id} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                {cat.icon || '📁'}
              </div>
              <div className="flex-grow min-w-0">
                <p className="font-medium text-gray-800">{cat.name}</p>
                {cat.description && <p className="text-sm text-gray-500 truncate">{cat.description}</p>}
                {cat.subcategories?.length > 0 && (
                  <p className="text-xs text-gray-400">{cat.subcategories.length} subcategories</p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(cat)}
                  className="p-2 text-gray-400 hover:text-green-600 rounded hover:bg-green-50 transition-colors">
                  <FiEdit2 size={14} />
                </button>
                <button onClick={() => handleDelete(cat)}
                  className="p-2 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors">
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          <div className="p-4 text-sm text-gray-400 text-center">
            {categories.length} categories · sorted A–Z
          </div>
        </div>
      )}
    </div>
  );
}
