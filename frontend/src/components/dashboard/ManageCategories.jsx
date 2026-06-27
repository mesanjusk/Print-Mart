import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Plus, X, Check, FolderOpen } from 'lucide-react';
import { categoryAPI } from '../../services/api';
import { Button } from '../ui/button';
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

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (cat) => { setEditing(cat); setForm({ name: cat.name, description: cat.description || '', icon: cat.icon || '' }); setShowForm(true); };
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
    if (!confirm(`Delete category "${cat.name}"? Products will be uncategorized.`)) return;
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
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{categories.length} categories · sorted A–Z</p>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border-l-4 border-l-primary-500 border-y border-r border-border bg-card p-5 mb-5 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">{editing ? 'Edit Category' : 'New Category'}</h3>
              <Button variant="ghost" size="icon-sm" onClick={closeForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input" placeholder="e.g. Business Cards" autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input" placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Icon (emoji)</label>
                <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="input" placeholder="e.g. 🖨️" maxLength={4} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button loading={saving} onClick={handleSave} size="sm" className="gap-1.5">
                {!saving && <><Check className="h-3.5 w-3.5" /> {editing ? 'Save Changes' : 'Add Category'}</>}
              </Button>
              <Button variant="outline" size="sm" onClick={closeForm}>Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner size="lg" /></div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FolderOpen className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No categories yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Add your first category to organize products.</p>
          <Button size="sm" onClick={openAdd}>Add your first category</Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border/50 overflow-hidden">
          {categories.map((cat) => (
            <div key={cat._id} className="flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors">
              <div className="h-9 w-9 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                {cat.icon || '📁'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{cat.name}</p>
                {cat.description && <p className="text-sm text-muted-foreground truncate">{cat.description}</p>}
                {cat.subcategories?.length > 0 && (
                  <p className="text-xs text-muted-foreground/60">{cat.subcategories.length} subcategories</p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(cat)} className="text-muted-foreground hover:text-primary-600">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(cat)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
