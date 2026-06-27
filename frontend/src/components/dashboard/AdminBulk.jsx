import { useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, UserPlus, LayoutGrid, Package, CheckCircle2, Users } from 'lucide-react';
import { bulkAPI } from '../../services/api';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

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
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 p-3">
          <p className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Created ({results.created.length})</p>
          <ul className="list-disc list-inside text-emerald-600 dark:text-emerald-400 space-y-0.5">
            {results.created.map((r, i) => (
              <li key={i}>{typeof r === 'object' ? `${r.name} (${r.email})${r.otpSent ? ' - OTP sent' : ''}` : r}</li>
            ))}
          </ul>
        </div>
      )}
      {results.skipped?.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-3">
          <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">Skipped ({results.skipped.length})</p>
          <ul className="list-disc list-inside text-amber-600 dark:text-amber-400 space-y-0.5">
            {results.skipped.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
      {results.errors?.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          <p className="font-semibold text-destructive mb-1">Errors ({results.errors.length})</p>
          <ul className="list-disc list-inside text-destructive/80 space-y-0.5">
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
      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold mt-3">
        <CheckCircle2 className="h-4 w-4" /> Account Activated
      </div>
    );
  }

  return (
    <form onSubmit={handleConfirm} className="flex flex-col sm:flex-row gap-2 mt-3">
      <input
        type="email" required placeholder="Seller email"
        value={email} onChange={e => setEmail(e.target.value)}
        className="input flex-1 text-sm"
      />
      <input
        type="text" required placeholder="OTP code"
        value={otp} onChange={e => setOtp(e.target.value)}
        className="input w-36 text-sm"
      />
      <Button type="submit" loading={loading} size="sm">
        {!loading && 'Confirm OTP'}
      </Button>
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
      <h3 className="font-semibold text-foreground mb-4">Add Single Seller</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
        {[
          { field: 'name', label: 'Name', type: 'text', required: true },
          { field: 'email', label: 'Email', type: 'email', required: true },
          { field: 'phone', label: 'Phone', type: 'text' },
          { field: 'businessName', label: 'Business Name', type: 'text' },
          { field: 'gstin', label: 'GSTIN', type: 'text' },
        ].map(({ field, label, type, required }) => (
          <div key={field}>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
            <input
              type={type} required={required}
              value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              className="input w-full"
            />
          </div>
        ))}
        <div className="sm:col-span-2">
          <Button type="submit" loading={loading}>
            {!loading && 'Create Seller'}
          </Button>
        </div>
      </form>

      {result && (
        <div className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-sm space-y-1">
          <p className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Seller Created
          </p>
          <p className="text-foreground">Email: <strong>{result.email}</strong></p>
          <p className="text-foreground">Temp Password: <strong>{result.tempPassword}</strong></p>
          <p className="text-muted-foreground">{result.otpSent ? 'OTP sent to WhatsApp' : 'No phone — OTP not sent'}</p>
          <div className="mt-3">
            <p className="font-medium text-foreground mb-1">Confirm seller OTP:</p>
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
      <h3 className="font-semibold text-foreground mb-4">Bulk Import Sellers</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Upload CSV (name,email,phone,businessName,gstin)</label>
          <input type="file" accept=".csv" onChange={handleFile} className="text-sm text-muted-foreground" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Or paste JSON array</label>
          <textarea
            rows={6} value={json} onChange={e => setJson(e.target.value)}
            placeholder='[{"name":"...","email":"...","phone":"...","businessName":"..."}]'
            className="input w-full font-mono text-sm"
          />
        </div>
        <Button type="submit" loading={loading} disabled={!json.trim()} className="gap-1.5">
          {!loading && <><Upload className="h-3.5 w-3.5" /> Import Sellers</>}
        </Button>
      </form>
      <ResultsTable results={results} />
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm font-medium text-foreground mb-2">Confirm Seller OTP</p>
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
      <h3 className="font-semibold text-foreground mb-2">Bulk Import Products</h3>
      <p className="text-xs text-muted-foreground mb-4">CSV columns: name, description, categoryName, sellerEmail, priceMin, priceMax, unit, minOrderQty, tags</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Upload CSV</label>
          <input type="file" accept=".csv" onChange={handleFile} className="text-sm text-muted-foreground" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Or paste JSON array</label>
          <textarea
            rows={6} value={json} onChange={e => setJson(e.target.value)}
            placeholder='[{"name":"...","categoryName":"...","sellerEmail":"...","priceMin":100}]'
            className="input w-full font-mono text-sm"
          />
        </div>
        <Button type="submit" loading={loading} disabled={!json.trim()} className="gap-1.5">
          {!loading && <><Upload className="h-3.5 w-3.5" /> Import Products</>}
        </Button>
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
      <h3 className="font-semibold text-foreground mb-2">Bulk Import Categories</h3>
      <p className="text-xs text-muted-foreground mb-4">CSV columns: name, description, icon</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Upload CSV</label>
          <input type="file" accept=".csv" onChange={handleFile} className="text-sm text-muted-foreground" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Or paste JSON array</label>
          <textarea
            rows={6} value={json} onChange={e => setJson(e.target.value)}
            placeholder='[{"name":"Business Cards","description":"...","icon":"🪪"}]'
            className="input w-full font-mono text-sm"
          />
        </div>
        <Button type="submit" loading={loading} disabled={!json.trim()} className="gap-1.5">
          {!loading && <><Upload className="h-3.5 w-3.5" /> Import Categories</>}
        </Button>
      </form>
      <ResultsTable results={results} />
    </div>
  );
}

const TABS = [
  { id: 'add-seller', label: 'Add Seller', icon: UserPlus, component: AddSellerTab },
  { id: 'bulk-sellers', label: 'Bulk Sellers', icon: Users, component: BulkSellersTab },
  { id: 'bulk-products', label: 'Bulk Products', icon: Package, component: BulkProductsTab },
  { id: 'bulk-categories', label: 'Bulk Categories', icon: LayoutGrid, component: BulkCategoriesTab },
];

export default function AdminBulk() {
  const [activeTab, setActiveTab] = useState('add-seller');
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || AddSellerTab;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-xl font-bold text-foreground mb-6">Bulk Import</h2>
      <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-4">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === id
                ? "bg-primary-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      <ActiveComponent />
    </div>
  );
}
