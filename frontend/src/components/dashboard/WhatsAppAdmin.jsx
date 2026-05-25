import { useState, useEffect, useCallback } from 'react';
import { waAdminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Spinner from '../common/Spinner';
import {
  FiMessageSquare, FiSend, FiUsers, FiActivity, FiSettings,
  FiCheckCircle, FiXCircle, FiPhone, FiChevronDown, FiChevronUp,
  FiRefreshCw, FiRadio
} from 'react-icons/fi';

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
      active ? 'border-green-600 text-green-700 bg-green-50' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    {children}
  </button>
);

const StatCard = ({ label, value, sub, color = 'green', icon }) => (
  <div className="card p-4 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
      color === 'green' ? 'bg-green-100 text-green-600' :
      color === 'blue' ? 'bg-blue-100 text-blue-600' :
      color === 'purple' ? 'bg-purple-100 text-purple-600' :
      'bg-orange-100 text-orange-600'
    }`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-800">{value ?? '–'}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  </div>
);

// ─── Stats Tab ────────────────────────────────────────────────────────────────
function StatsPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    waAdminAPI.getStats().then((r) => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!stats) return <p className="text-gray-500">Failed to load stats.</p>;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Messages" value={stats.totalMessages} icon={<FiMessageSquare />} color="green" />
        <StatCard label="Inbound" value={stats.inboundMessages} icon={<FiChevronDown />} color="blue" />
        <StatCard label="Outbound" value={stats.outboundMessages} icon={<FiChevronUp />} color="purple" />
        <StatCard label="Active Sessions (7d)" value={stats.activeSessionsLast7Days} icon={<FiUsers />} color="orange" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Orders via WhatsApp" value={stats.ordersViaWhatsapp} sub={`of ${stats.totalOrders} total`} icon={<FiActivity />} color="green" />
        <StatCard label="WA Conversion Rate" value={`${stats.waConversionRate}%`} icon={<FiCheckCircle />} color="blue" />
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><FiSettings /> Config Status</h3>
          {Object.entries(stats.config || {}).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-xs mb-1">
              {typeof v === 'boolean'
                ? v ? <FiCheckCircle className="text-green-500 flex-shrink-0" /> : <FiXCircle className="text-red-500 flex-shrink-0" />
                : <FiCheckCircle className="text-blue-400 flex-shrink-0" />
              }
              <span className="text-gray-600">{k.replace(/([A-Z])/g, ' $1').trim()}: {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v}</span>
            </div>
          ))}
        </div>
      </div>

      {stats.dailyMessages?.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Messages per Day (Last 7 Days)</h3>
          <div className="flex items-end gap-2 h-24">
            {stats.dailyMessages.map((d) => {
              const max = Math.max(...stats.dailyMessages.map((x) => x.count), 1);
              return (
                <div key={d._id} className="flex flex-col items-center flex-1">
                  <div
                    className="w-full bg-green-400 rounded-t"
                    style={{ height: `${(d.count / max) * 80}px` }}
                  />
                  <span className="text-xs text-gray-400 mt-1 truncate">{d._id?.slice(5)}</span>
                  <span className="text-xs font-medium">{d.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Conversations Tab ────────────────────────────────────────────────────────
function ConversationsPanel() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadConversations = useCallback((p = 1) => {
    setLoading(true);
    waAdminAPI.getConversations({ page: p, limit: 15 }).then((r) => {
      setConversations(r.data.conversations || []);
      setTotalPages(r.data.pages || 1);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadConversations(page); }, [page, loadConversations]);

  const openConversation = (phone) => {
    setSelected(phone);
    setMsgLoading(true);
    waAdminAPI.getConversationByPhone(phone, { limit: 50 }).then((r) => {
      setMessages(r.data.messages || []);
      setMsgLoading(false);
    }).catch(() => setMsgLoading(false));
  };

  return (
    <div className="flex gap-4 h-[600px]">
      <div className="w-64 flex-shrink-0 overflow-y-auto border rounded-lg">
        <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Conversations</span>
          <button onClick={() => loadConversations(1)} className="text-gray-400 hover:text-gray-600"><FiRefreshCw size={14} /></button>
        </div>
        {loading ? <div className="p-4"><Spinner /></div> : (
          conversations.map(({ session, recentMessages }) => (
            <button
              key={session.phone}
              onClick={() => openConversation(session.phone)}
              className={`w-full text-left p-3 border-b hover:bg-gray-50 transition-colors ${selected === session.phone ? 'bg-green-50 border-l-2 border-l-green-500' : ''}`}
            >
              <p className="text-sm font-medium text-gray-800 truncate">
                {session.userId?.name || session.phone}
              </p>
              <p className="text-xs text-gray-400">{session.phone}</p>
              <p className="text-xs text-gray-500 capitalize">{session.role}</p>
              {recentMessages[recentMessages.length - 1] && (
                <p className="text-xs text-gray-400 mt-1 truncate">
                  {recentMessages[recentMessages.length - 1].direction === 'inbound' ? '← ' : '→ '}
                  {recentMessages[recentMessages.length - 1].message}
                </p>
              )}
            </button>
          ))
        )}
        {totalPages > 1 && (
          <div className="p-2 flex justify-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-xs px-2 py-1 border rounded disabled:opacity-40">Prev</button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="text-xs px-2 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      <div className="flex-grow border rounded-lg flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Select a conversation to view messages
          </div>
        ) : msgLoading ? (
          <div className="flex items-center justify-center h-full"><Spinner /></div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-3 border-b bg-gray-50 flex items-center gap-2">
              <FiPhone size={14} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{selected}</span>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-2">
              {messages.map((msg) => (
                <div key={msg._id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    msg.direction === 'outbound' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-green-100' : 'text-gray-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {messages.length === 0 && <p className="text-center text-gray-400 text-sm">No messages yet</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Broadcast Tab ────────────────────────────────────────────────────────────
function BroadcastPanel() {
  const [form, setForm] = useState({ message: '', role: 'buyer', phones: '' });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    if (!form.message.trim()) return toast.error('Message is required');
    setSending(true);
    setResult(null);
    try {
      const payload = {
        message: form.message,
        role: form.phones.trim() ? undefined : form.role,
        phones: form.phones.trim() ? form.phones.split(/[\n,]+/).map((p) => p.trim()).filter(Boolean) : [],
      };
      const res = await waAdminAPI.sendBroadcast(payload);
      setResult(res.data);
      toast.success(`Broadcast sent to ${res.data.sent} contacts`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Broadcast failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><FiRadio /> Send Broadcast Message</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full input"
            >
              <option value="buyer">All Buyers</option>
              <option value="seller">All Vendors</option>
              <option value="">Custom (enter phones below)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Phones (optional, one per line or comma-separated)
            </label>
            <textarea
              value={form.phones}
              onChange={(e) => setForm({ ...form, phones: e.target.value })}
              className="w-full input h-20 resize-none font-mono text-sm"
              placeholder="9876543210&#10;9123456789"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full input h-32 resize-none"
              placeholder="Enter your broadcast message. Supports WhatsApp formatting: *bold*, _italic_, ~strikethrough~"
            />
            <p className="text-xs text-gray-400 mt-1">{form.message.length} characters</p>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !form.message.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {sending ? <><FiRefreshCw className="animate-spin" /> Sending...</> : <><FiSend /> Send Broadcast</>}
          </button>
        </div>
      </div>

      {result && (
        <div className="card p-4 border-l-4 border-green-500">
          <h4 className="font-medium text-gray-800 mb-2">Broadcast Result</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-2xl font-bold text-green-600">{result.sent}</p><p className="text-xs text-gray-500">Sent</p></div>
            <div><p className="text-2xl font-bold text-red-500">{result.failed}</p><p className="text-xs text-gray-500">Failed</p></div>
            <div><p className="text-2xl font-bold text-gray-700">{result.total}</p><p className="text-xs text-gray-500">Total</p></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Direct Message Tab ───────────────────────────────────────────────────────
function DirectMessagePanel() {
  const [form, setForm] = useState({ phone: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!form.phone.trim() || !form.message.trim()) return toast.error('Phone and message are required');
    setSending(true);
    try {
      await waAdminAPI.sendDirect(form);
      toast.success('Message sent!');
      setForm({ phone: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-lg">
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2"><FiSend /> Send Direct Message</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input w-full"
            placeholder="9876543210 or +919876543210"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="input w-full h-28 resize-none"
            placeholder="Type your message here..."
          />
        </div>
        <button
          onClick={handleSend}
          disabled={sending}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {sending ? <><FiRefreshCw className="animate-spin" /> Sending...</> : <><FiSend /> Send Message</>}
        </button>
      </div>
    </div>
  );
}

// ─── Logs Tab ─────────────────────────────────────────────────────────────────
function LogsPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ phone: '', direction: '' });

  const load = useCallback(() => {
    setLoading(true);
    waAdminAPI.getLogs({ page, limit: 30, ...filter }).then((r) => {
      setLogs(r.data.logs || []);
      setTotal(r.data.total || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          value={filter.phone}
          onChange={(e) => { setFilter({ ...filter, phone: e.target.value }); setPage(1); }}
          className="input"
          placeholder="Filter by phone"
        />
        <select
          value={filter.direction}
          onChange={(e) => { setFilter({ ...filter, direction: e.target.value }); setPage(1); }}
          className="input"
        >
          <option value="">All directions</option>
          <option value="inbound">Inbound</option>
          <option value="outbound">Outbound</option>
        </select>
        <button onClick={load} className="btn-secondary flex items-center gap-1 text-sm">
          <FiRefreshCw size={14} /> Refresh
        </button>
        <span className="text-sm text-gray-500 self-center">{total} total logs</span>
      </div>

      {loading ? <Spinner /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Time</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Dir</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Phone</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">User</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Type</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Message</th>
                <th className="text-left px-3 py-2 text-gray-600 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleDateString('en-IN')} {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`badge text-xs ${log.direction === 'inbound' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {log.direction === 'inbound' ? '← in' : '→ out'}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{log.phone}</td>
                  <td className="px-3 py-2 text-gray-700 text-xs">{log.userId?.name || '–'}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{log.messageType}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-xs truncate">{log.message}</td>
                  <td className="px-3 py-2">
                    <span className={`badge text-xs ${log.status === 'sent' || log.status === 'received' ? 'bg-gray-100 text-gray-600' : log.status === 'delivered' ? 'bg-green-100 text-green-600' : log.status === 'read' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No logs found</p>}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary text-sm disabled:opacity-40">← Prev</button>
        <span className="text-sm text-gray-500">Page {page}</span>
        <button disabled={logs.length < 30} onClick={() => setPage((p) => p + 1)} className="btn-secondary text-sm disabled:opacity-40">Next →</button>
      </div>
    </div>
  );
}

// ─── Bot Flow Reference ────────────────────────────────────────────────────────
function BotFlowPanel() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-green-600">👤</span> Buyer Commands
        </h3>
        <div className="space-y-2 text-sm">
          {[
            { cmd: 'Hi / Hello / Start', desc: 'Show welcome menu' },
            { cmd: 'HELP', desc: 'Show all buyer commands' },
            { cmd: 'STATUS', desc: 'View open inquiries & active orders' },
            { cmd: 'ORDERS', desc: 'List recent orders' },
            { cmd: 'QUOTES', desc: 'View pending quotations' },
            { cmd: 'ACCEPT', desc: 'Accept latest pending quotation (auto-creates order)' },
            { cmd: 'REJECT', desc: 'Reject latest pending quotation' },
            { cmd: 'PAID [order-no]', desc: 'Confirm payment e.g. PAID PM-2024-0001' },
            { cmd: 'TRACK [order-no]', desc: 'Get tracking info' },
            { cmd: 'CANCEL [order-no]', desc: 'Cancel an order' },
            { cmd: 'Any other text', desc: 'Reply to open inquiry thread' },
          ].map((item) => (
            <div key={item.cmd} className="flex gap-2">
              <code className="text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap flex-shrink-0">{item.cmd}</code>
              <span className="text-gray-600">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-blue-600">🏪</span> Vendor Commands
        </h3>
        <div className="space-y-2 text-sm">
          {[
            { cmd: 'Hi / Hello / MENU', desc: 'Show vendor welcome menu' },
            { cmd: 'HELP', desc: 'Show all vendor commands' },
            { cmd: 'STATUS', desc: 'Show pending inquiries & active orders' },
            { cmd: 'ORDERS', desc: 'List all orders with status' },
            { cmd: 'QUOTE 5000', desc: 'Create ₹5000 quotation for latest inquiry' },
            { cmd: 'QUOTE INQ-ABC 8000', desc: 'Create quotation for specific inquiry' },
            { cmd: 'DISPATCH PM-2024-0001 DTDC-TRK789', desc: 'Mark order dispatched with tracking' },
            { cmd: 'DELIVER PM-2024-0001', desc: 'Mark order as delivered' },
            { cmd: 'Any other text', desc: 'Reply to open inquiry thread' },
          ].map((item) => (
            <div key={item.cmd} className="flex gap-2">
              <code className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap flex-shrink-0">{item.cmd}</code>
              <span className="text-gray-600">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 md:col-span-2">
        <h3 className="font-semibold text-gray-800 mb-3">📋 Complete Order Flow (All via WhatsApp)</h3>
        <div className="flex flex-wrap gap-2 items-center text-sm">
          {[
            '1. Customer inquires on website',
            '→ Seller notified on WhatsApp',
            '→ Seller replies via WhatsApp',
            '→ Buyer replies via WhatsApp',
            '→ Seller sends QUOTE 5000',
            '→ Buyer receives quotation',
            '→ Buyer sends ACCEPT',
            '→ Order auto-created',
            '→ Buyer sends PAID PM-xxx',
            '→ Seller notified of payment',
            '→ Seller sends DISPATCH PM-xxx TRK123',
            '→ Buyer gets tracking info',
            '→ Seller sends DELIVER PM-xxx',
            '✅ Order complete',
          ].map((step, i) => (
            <span key={i} className={`px-2 py-1 rounded text-xs ${step.startsWith('→') ? 'bg-gray-100 text-gray-600' : step.startsWith('✅') ? 'bg-green-100 text-green-700 font-medium' : 'bg-blue-50 text-blue-700 font-medium'}`}>
              {step}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WhatsAppAdmin() {
  const [tab, setTab] = useState('stats');

  const tabs = [
    { id: 'stats', label: '📊 Analytics' },
    { id: 'conversations', label: '💬 Conversations' },
    { id: 'broadcast', label: '📣 Broadcast' },
    { id: 'direct', label: '✉️ Direct Message' },
    { id: 'logs', label: '📋 Message Logs' },
    { id: 'flow', label: '🤖 Bot Commands' },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">WhatsApp Admin</h1>
          <p className="text-sm text-gray-500">Manage WhatsApp bot, conversations, and broadcasts</p>
        </div>
      </div>

      <div className="border-b mb-6 flex flex-wrap gap-1">
        {tabs.map((t) => (
          <TabButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      {tab === 'stats' && <StatsPanel />}
      {tab === 'conversations' && <ConversationsPanel />}
      {tab === 'broadcast' && <BroadcastPanel />}
      {tab === 'direct' && <DirectMessagePanel />}
      {tab === 'logs' && <LogsPanel />}
      {tab === 'flow' && <BotFlowPanel />}
    </div>
  );
}
