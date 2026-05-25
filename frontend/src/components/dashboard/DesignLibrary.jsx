import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiUpload, FiTrash2, FiRefreshCw, FiImage, FiFile } from 'react-icons/fi';
import { designAPI } from '../../services/api';
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
          <h1 className="text-xl font-bold text-gray-800">My Design Library</h1>
          <p className="text-sm text-gray-500 mt-0.5">Upload AI or Canva designs. Reorder anytime with one click.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1.5 text-sm">
          <FiUpload size={15} /> Upload Design
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleUpload} className="card p-5 mb-6 bg-green-50 border border-green-200 space-y-3">
          <h2 className="font-semibold text-gray-800">Upload New Design</h2>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Design Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. My Company Card v2"
              className="input"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input capitalize">
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c.replace(/-/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">File (PDF/PNG/JPG) *</label>
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="input py-1.5" required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Any special notes about this design..."
              rows={2}
              className="input resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={uploading} className="btn-primary text-sm">
              {uploading ? 'Uploading...' : 'Upload Design'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <Spinner />
      ) : designs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiImage size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">No designs yet</p>
          <p className="text-sm">Upload your first design to start reordering easily</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {designs.map((d) => (
            <div key={d._id} className="card overflow-hidden group">
              <div className="bg-gray-100 h-36 flex items-center justify-center relative">
                {isPdf(d) ? (
                  <div className="text-center">
                    <FiFile size={36} className="text-red-400 mx-auto mb-1" />
                    <span className="text-xs text-gray-500 uppercase font-medium">PDF</span>
                  </div>
                ) : (
                  <img src={d.fileUrl} alt={d.name} className="w-full h-full object-contain p-2" />
                )}
                <button
                  onClick={() => handleDelete(d._id)}
                  className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
              <div className="p-3">
                <p className="font-medium text-sm text-gray-800 truncate">{d.name}</p>
                {d.category && (
                  <span className="text-xs text-green-600 capitalize">{d.category.replace(/-/g, ' ')}</span>
                )}
                {d.usedCount > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">Used {d.usedCount} time{d.usedCount !== 1 ? 's' : ''}</p>
                )}
                <div className="mt-2 flex gap-1.5">
                  <Link
                    to={`/products${d.category ? `?keyword=${d.category.replace(/-/g, '+')}` : ''}`}
                    state={{ reorderDesign: d }}
                    className="flex-1 text-center text-xs bg-green-600 text-white py-1.5 rounded hover:bg-green-700 flex items-center justify-center gap-1"
                  >
                    <FiRefreshCw size={11} /> Reorder
                  </Link>
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs border border-gray-300 text-gray-600 px-2 py-1.5 rounded hover:bg-gray-50"
                  >
                    View
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
