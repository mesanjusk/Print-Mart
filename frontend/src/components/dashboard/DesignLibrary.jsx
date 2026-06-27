import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Trash2, RefreshCw, Image, FileText, X, Plus } from 'lucide-react';
import { designAPI } from '../../services/api';
import { Button } from '../ui/button';
import Spinner from '../common/Spinner';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'visiting-card', 'banner', 'brochure', 'flyer', 'stationery',
  'packaging', 'corporate-gift', 'label', 'book', 'other',
];

export default function DesignLibrary() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', description: '' });
  const fileRef = useRef(null);

  const fetchDesigns = () => {
    designAPI.getAll()
      .then((r) => setDesigns(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('Failed to load designs'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchDesigns, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error('Please select a file');
    if (!form.name.trim()) return toast.error('Please enter a design name');

    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', form.name);
    fd.append('category', form.category);
    fd.append('description', form.description);

    try {
      await designAPI.upload(fd);
      toast.success('Design uploaded!');
      setShowForm(false);
      setForm({ name: '', category: '', description: '' });
      if (fileRef.current) fileRef.current.value = '';
      fetchDesigns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this design from your library?')) return;
    try {
      await designAPI.remove(id);
      toast.success('Design removed');
      setDesigns((prev) => prev.filter((d) => d._id !== id));
    } catch {
      toast.error('Failed to remove design');
    }
  };

  const isPdf = (d) => d.fileType === 'pdf' || d.fileUrl?.includes('.pdf');

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Design Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Upload AI or Canva designs. Reorder anytime with one click.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Upload Design'}
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleUpload}
            className="rounded-xl border border-primary-200 dark:border-primary-800/40 bg-primary-50/50 dark:bg-primary-950/20 p-5 mb-6 space-y-4 overflow-hidden"
          >
            <h2 className="font-semibold text-foreground">Upload New Design</h2>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Design Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. My Company Card v2"
                className="input"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input capitalize">
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">{c.replace(/-/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">File (PDF/PNG/JPG) *</label>
                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="input py-1.5 text-sm" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Any special notes about this design..."
                rows={2}
                className="input resize-none"
              />
            </div>
            <Button type="submit" loading={uploading} size="sm">
              {!uploading && <><Upload className="h-3.5 w-3.5" /> Upload Design</>}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner size="lg" /></div>
      ) : designs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Image className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No designs yet</h3>
          <p className="text-muted-foreground text-sm">Upload your first design to start reordering easily</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {designs.map((d) => (
            <motion.div
              key={d._id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-border bg-card overflow-hidden group hover:border-primary-200 dark:hover:border-primary-800 transition-colors shadow-card"
            >
              <div className="bg-muted h-36 flex items-center justify-center relative overflow-hidden">
                {isPdf(d) ? (
                  <div className="text-center">
                    <FileText className="h-10 w-10 text-destructive mx-auto mb-1" />
                    <span className="text-xs text-muted-foreground uppercase font-semibold">PDF</span>
                  </div>
                ) : (
                  <img src={d.fileUrl} alt={d.name} className="w-full h-full object-contain p-2" />
                )}
                <button
                  onClick={() => handleDelete(d._id)}
                  className="absolute top-2 right-2 p-1.5 bg-card rounded-full shadow-sm text-muted-foreground hover:text-destructive border border-border opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-foreground truncate">{d.name}</p>
                {d.category && (
                  <p className="text-xs text-primary-600 dark:text-primary-400 capitalize mt-0.5">{d.category.replace(/-/g, ' ')}</p>
                )}
                {d.usedCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">Used {d.usedCount} time{d.usedCount !== 1 ? 's' : ''}</p>
                )}
                <div className="mt-3 flex gap-1.5">
                  <Link
                    to={`/products${d.category ? `?keyword=${d.category.replace(/-/g, '+')}` : ''}`}
                    state={{ reorderDesign: d }}
                    className="flex-1 flex items-center justify-center gap-1 text-xs bg-primary-600 hover:bg-primary-700 text-white py-1.5 rounded-lg transition-colors font-medium"
                  >
                    <RefreshCw className="h-3 w-3" /> Reorder
                  </Link>
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs border border-border text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    View
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
