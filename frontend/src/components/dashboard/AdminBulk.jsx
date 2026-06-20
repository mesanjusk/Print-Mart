import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiUpload, FiUserPlus, FiGrid, FiPackage, FiCheck, FiX } from 'react-icons/fi';
import { bulkAPI } from '../../services/api';

function parseCSV(text, fields) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

function ResultsTable({ results }) {
  if (!results) return null;
  return (
    <div className="mt-4 space-y-3 text-sm">
      {results.created?.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <p className="font-semibold text-green-700 mb-1">Created ({results.created.length})</p>
          <ul className="list-disc list-inside text-green-600">
            {results.created.map((r, i) => (
              <li key={i}>{typeof r === 'object' ? `${r.name} (${r.email})${r.otpSent ? ' - OTP sent' : ''}` : r}</li>
            ))}
          </ul>
        </div>
      )}
      {results.skipped?.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <p className="font-semibold text-yellow-700 mb-1">Skipped ({results.skipped.length})</p>
          <ul className="list-disc list-inside text-yellow-600">
            {results.skipped.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
      {results.errors?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="font-semibold text-red-700 mb-1">Errors ({results.errors.length})</p>
          <ul className="list-disc list-inside text-red-600">
            {results.errors.map((r, i) => (
              <li key={i}>{typeof r === 'object' ? `${r.name || r.email}: ${r.error}` : r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function OTPConfirmForm() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await bulkAPI.confirmSellerOTP(email, otp);
      toast.success(data.message || 'Account activated!');
      setConfirmed(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm OTP');
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <div className="flex items-center gap-2 text-green-600 font-semibold mt-3">
        <FiCheck /> Account Activated
      </div>
    );
  }

  return (
    <form onSubmit={handleConfirm} className="flex flex-col sm:flex-row gap-2 mt-3">
      <input
        type="email" required placeholder="Seller email"
        value={email} onChange={e => setEmail(e.target.value)}
        className="border rounded px-3 py-2 text-sm flex-1"
      />
      <input
        type="text" required placeholder="OTP code"
        value={otp} onChange={e => setOtp(e.target.value)}
        className="border rounded px-3 py-2 text-sm w-36"
      />
      <button type="submit" disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50">
        {loading ? 'Confirming...' : 'Confirm OTP'}
      </button>
    </form>
  );
}

function AddSellerTab() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', businessName: '', gstin: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await bulkAPI.addSeller(form);
      toast.success('Seller created!');
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create seller');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4">Add Single Seller</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
        {[
          { field: 'name', label: 'Name', type: 'text', required: true },
          { field: 'email', label: 'Email', type: 'email', required: true },
          { field: 'phone', label: 'Phone', type: 'text' },
          { field: 'businessName', label: 'Business Name', type: 'text' },
          { field: 'gstin', label: 'GSTIN', type: 'text' },
        ].map(({ field, label, type, required }) => (
          <div key={field}>
            <label className="block text-xs text-gray-500 mb-1">{label}</label>
            <input
              type={type} required={required}
              value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
        ))}
        <div className="sm:col-span-2">
          <button type="submit" disabled={loading}
            className="bg-green-600 text-white px-5 py-2 rounded font-semibold text-sm disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Seller'}
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded p-4 text-sm space-y-1">
          <p className="text-green-700 font-semibold flex items-center gap-2"><FiCheck /> Seller Created</p>
          <p>Email: <strong>{result.email}</strong></p>
          <p>Temp Password: <strong>{result.tempPassword}</strong></p>
          <p>{result.otpSent ? 'OTP sent to WhatsApp' : 'No phone — OTP not sent'}</p>
          <div className="mt-3">
            <p className="font-medium text-gray-600 mb-1">Confirm seller OTP:</p>
            <OTPConfirmForm />
          </div>
        </div>
      )}
    </div>
  );
}

function BulkSellersTab() {
  const [json, setJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result, ['name','email','phone','businessName','gstin']);
      setJson(JSON.stringify(parsed, null, 2));
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const sellers = JSON.parse(json);
      const { data } = await bulkAPI.importSellers({ sellers });
      toast.success(`Done: ${data.created?.length || 0} created`);
      setResults(data);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4">Bulk Import Sellers</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Upload CSV (name,email,phone,businessName,gstin)</label>
          <input type="file" accept=".csv" onChange={handleFile} className="text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Or paste JSON array</label>
          <textarea
            rows={6} value={json} onChange={e => setJson(e.target.value)}
            placeholder='[{"name":"...","email":"...","phone":"...","businessName":"..."}]'
            className="w-full border rounded px-3 py-2 text-sm font-mono"
          />
        </div>
        <button type="submit" disabled={loading || !json.trim()}
          className="bg-green-600 text-white px-5 py-2 rounded font-semibold text-sm disabled:opacity-50 flex items-center gap-2">
          <FiUpload /> {loading ? 'Importing...' : 'Import Sellers'}
        </button>
      </form>
      <ResultsTable results={results} />
      <div className="mt-4 border-t pt-4">
        <p className="text-sm font-medium text-gray-600 mb-2">Confirm Seller OTP</p>
        <OTPConfirmForm />
      </div>
    </div>
  );
}

function BulkProductsTab() {
  const [json, setJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result, ['name','description','categoryName','sellerEmail','priceMin','priceMax','unit','minOrderQty','tags']);
      setJson(JSON.stringify(parsed, null, 2));
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const products = JSON.parse(json);
      const { data } = await bulkAPI.importProducts({ products });
      toast.success(`Done: ${data.created?.length || 0} created`);
      setResults(data);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4">Bulk Import Products</h3>
      <p className="text-xs text-gray-500 mb-3">CSV columns: name, description, categoryName, sellerEmail, priceMin, priceMax, unit, minOrderQty, tags</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Upload CSV</label>
          <input type="file" accept=".csv" onChange={handleFile} className="text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Or paste JSON array</label>
          <textarea
            rows={6} value={json} onChange={e => setJson(e.target.value)}
            placeholder='[{"name":"...","categoryName":"...","sellerEmail":"...","priceMin":100}]'
            className="w-full border rounded px-3 py-2 text-sm font-mono"
          />
        </div>
        <button type="submit" disabled={loading || !json.trim()}
          className="bg-green-600 text-white px-5 py-2 rounded font-semibold text-sm disabled:opacity-50 flex items-center gap-2">
          <FiUpload /> {loading ? 'Importing...' : 'Import Products'}
        </button>
      </form>
      <ResultsTable results={results} />
    </div>
  );
}

function BulkCategoriesTab() {
  const [json, setJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result, ['name','description','icon']);
      setJson(JSON.stringify(parsed, null, 2));
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const categories = JSON.parse(json);
      const { data } = await bulkAPI.importCategories({ categories });
      toast.success(`Done: ${data.created?.length || 0} created`);
      setResults(data);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4">Bulk Import Categories</h3>
      <p className="text-xs text-gray-500 mb-3">CSV columns: name, description, icon</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Upload CSV</label>
          <input type="file" accept=".csv" onChange={handleFile} className="text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Or paste JSON array</label>
          <textarea
            rows={6} value={json} onChange={e => setJson(e.target.value)}
            placeholder='[{"name":"Business Cards","description":"...","icon":"🪪"}]'
            className="w-full border rounded px-3 py-2 text-sm font-mono"
          />
        </div>
        <button type="submit" disabled={loading || !json.trim()}
          className="bg-green-600 text-white px-5 py-2 rounded font-semibold text-sm disabled:opacity-50 flex items-center gap-2">
          <FiUpload /> {loading ? 'Importing...' : 'Import Categories'}
        </button>
      </form>
      <ResultsTable results={results} />
    </div>
  );
}

const TABS = [
  { id: 'add-seller', label: 'Add Seller', icon: FiUserPlus, component: AddSellerTab },
  { id: 'bulk-sellers', label: 'Bulk Sellers', icon: FiUsers, component: BulkSellersTab },
  { id: 'bulk-products', label: 'Bulk Products', icon: FiPackage, component: BulkProductsTab },
  { id: 'bulk-categories', label: 'Bulk Categories', icon: FiGrid, component: BulkCategoriesTab },
];

// FiUsers not imported above — add it inline
function FiUsers(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

export default function AdminBulk() {
  const [activeTab, setActiveTab] = useState('add-seller');
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || AddSellerTab;

  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Bulk Import</h2>
      <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>
      <ActiveComponent />
    </div>
  );
}
