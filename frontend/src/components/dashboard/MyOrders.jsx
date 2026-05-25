import { useState, useEffect, useCallback } from 'react';
import { orderAPI, quotationAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Spinner from '../common/Spinner';
import {
  FiPackage, FiTruck, FiCheckCircle, FiXCircle,
  FiClock, FiChevronDown, FiChevronUp, FiRefreshCw, FiAlertCircle
} from 'react-icons/fi';

const STATUS_COLORS = {
  pending_payment: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  dispatched: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_STEPS = ['pending_payment', 'paid', 'processing', 'dispatched', 'delivered'];

function OrderTimeline({ status }) {
  if (status === 'cancelled') return (
    <div className="flex items-center gap-2 text-red-600 text-xs">
      <FiXCircle /> Order Cancelled
    </div>
  );
  const current = STATUS_STEPS.indexOf(status);
  const labels = ['Payment Pending', 'Paid', 'Processing', 'Dispatched', 'Delivered'];
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {STATUS_STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            i < current ? 'bg-green-500 text-white' :
            i === current ? 'bg-green-600 text-white ring-2 ring-green-200' :
            'bg-gray-100 text-gray-400'
          }`}>
            {i < current ? '✓' : i + 1}
          </div>
          <span className={`text-xs hidden sm:block ${i <= current ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{labels[i]}</span>
          {i < STATUS_STEPS.length - 1 && <div className={`h-0.5 w-4 sm:w-8 ${i < current ? 'bg-green-500' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );
}

function OrderCard({ order, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    setLoading(true);
    try {
      await orderAPI.cancel(order._id, { reason: 'Cancelled by buyer' });
      toast.success('Order cancelled');
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.message || 'Cannot cancel order'); } finally { setLoading(false); }
  };

  const canCancel = !['delivered', 'dispatched', 'cancelled'].includes(order.status);

  return (
    <div className="card mb-3 overflow-hidden">
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className={`badge text-xs flex items-center gap-1 flex-shrink-0 ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
          {order.status === 'delivered' ? <FiCheckCircle size={12} /> :
           order.status === 'dispatched' ? <FiTruck size={12} /> :
           order.status === 'cancelled' ? <FiXCircle size={12} /> : <FiClock size={12} />}
          {order.status.replace(/_/g, ' ')}
        </div>
        <div className="flex-grow min-w-0">
          <p className="font-semibold text-gray-800 text-sm">{order.orderNumber}</p>
          <p className="text-xs text-gray-500 truncate">{order.product?.name} • ₹{order.total?.toFixed(2)}</p>
        </div>
        <p className="text-xs text-gray-400 hidden sm:block flex-shrink-0">
          {new Date(order.createdAt).toLocaleDateString('en-IN')}
        </p>
        {expanded ? <FiChevronUp className="text-gray-400 flex-shrink-0" /> : <FiChevronDown className="text-gray-400 flex-shrink-0" />}
      </div>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          <OrderTimeline status={order.status} />

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Vendor</p>
              <p className="font-medium">{order.seller?.businessName || order.seller?.name}</p>
              <p className="text-gray-400 text-xs">{order.seller?.phone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Payment</p>
              <p className={`font-medium capitalize ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                {order.paymentStatus}
              </p>
              {order.paymentConfirmedAt && <p className="text-xs text-gray-400">{new Date(order.paymentConfirmedAt).toLocaleDateString('en-IN')}</p>}
            </div>
            {order.trackingInfo && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Tracking</p>
                <p className="font-medium font-mono text-sm">{order.trackingInfo}</p>
              </div>
            )}
            {order.deliveredAt && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Delivered On</p>
                <p className="font-medium text-green-600">{new Date(order.deliveredAt).toLocaleDateString('en-IN')}</p>
              </div>
            )}
          </div>

          {order.items?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Order Items</p>
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1.5 border-b last:border-0">
                  <span className="text-gray-700">{item.description}</span>
                  <span className="text-gray-500">{item.quantity} {item.unit} × ₹{item.unitPrice} = ₹{item.total?.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-sm pt-2">
                <span>Total Paid</span>
                <span className="text-green-700">₹{order.total?.toFixed(2)}</span>
              </div>
            </div>
          )}

          {order.status === 'pending_payment' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
              <p className="font-medium text-yellow-800 flex items-center gap-2">
                <FiAlertCircle /> Payment Instructions
              </p>
              <p className="text-yellow-700 mt-1">
                Please make payment of <strong>₹{order.total?.toFixed(2)}</strong> via bank transfer and then confirm via WhatsApp:
              </p>
              <code className="block mt-2 bg-white border border-yellow-200 rounded px-3 py-2 text-green-700 font-mono text-sm">
                PAID {order.orderNumber}
              </code>
            </div>
          )}

          {canCancel && (
            <button onClick={handleCancel} disabled={loading} className="text-xs text-red-600 hover:text-red-800 underline disabled:opacity-60">
              Cancel this order
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Quotations that can be accepted/rejected from dashboard
function PendingQuotations({ onOrderCreated }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    quotationAPI.getBuyerQuotations().then((r) => {
      setQuotes((r.data || []).filter((q) => q.status === 'sent'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleAccept = async (q) => {
    setActing(q._id);
    try {
      await orderAPI.createFromQuotation(q._id, {});
      toast.success('Quotation accepted! Order created. Vendor notified via WhatsApp.');
      setQuotes((prev) => prev.filter((x) => x._id !== q._id));
      onOrderCreated();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); } finally { setActing(null); }
  };

  const handleReject = async (q) => {
    setActing(q._id);
    try {
      await quotationAPI.updateStatus(q._id, 'rejected');
      toast.success('Quotation rejected');
      setQuotes((prev) => prev.filter((x) => x._id !== q._id));
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); } finally { setActing(null); }
  };

  if (loading) return null;
  if (!quotes.length) return null;

  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        Pending Quotations ({quotes.length})
      </h2>
      {quotes.map((q) => {
        const shortId = String(q._id).slice(-6).toUpperCase();
        return (
          <div key={q._id} className="card p-4 mb-3 border-l-4 border-yellow-400">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-800">Q-{shortId} from {q.seller?.businessName || q.seller?.name}</p>
                <p className="text-sm text-gray-500">{q.product?.name} • ₹{q.total?.toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Valid until {q.validUntil ? new Date(q.validUntil).toLocaleDateString('en-IN') : 'N/A'}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleAccept(q)}
                  disabled={!!acting}
                  className="btn-primary text-xs py-1.5 px-3 disabled:opacity-60"
                >
                  {acting === q._id ? <FiRefreshCw className="animate-spin" /> : '✓ Accept'}
                </button>
                <button
                  onClick={() => handleReject(q)}
                  disabled={!!acting}
                  className="bg-red-500 text-white text-xs py-1.5 px-3 rounded font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    orderAPI.getMyOrders({ status: statusFilter, page }).then((r) => {
      setOrders(r.data.orders || []);
      setPages(r.data.pages || 1);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const statuses = ['', 'pending_payment', 'paid', 'processing', 'dispatched', 'delivered', 'cancelled'];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">My Orders</h1>
        <button onClick={load} className="btn-secondary text-sm flex items-center gap-1">
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      <PendingQuotations onOrderCreated={() => { setRefreshKey((k) => k + 1); }} />

      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm">
        <p className="text-green-800 font-medium">💬 Manage orders via WhatsApp</p>
        <p className="text-green-700 text-xs mt-1">
          Send <code className="bg-white px-1 rounded">ACCEPT</code> to accept a quotation,&nbsp;
          <code className="bg-white px-1 rounded">PAID PM-xxxx</code> to confirm payment,&nbsp;
          <code className="bg-white px-1 rounded">TRACK PM-xxxx</code> to track an order.
        </p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              statusFilter === s ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-600'
            }`}
          >
            {s ? s.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : orders.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <FiPackage size={40} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No orders yet</p>
          <p className="text-xs mt-1">Browse products and send inquiries to get started</p>
        </div>
      ) : (
        orders.map((order) => <OrderCard key={order._id} order={order} onRefresh={load} />)
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-3 mt-4">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary text-sm disabled:opacity-40">← Prev</button>
          <span className="text-sm text-gray-500 self-center">Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="btn-secondary text-sm disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
