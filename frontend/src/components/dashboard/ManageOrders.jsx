import { useState, useEffect, useCallback } from 'react';
import { orderAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Spinner from '../common/Spinner';
import {
  FiPackage, FiTruck, FiCheckCircle, FiXCircle,
  FiClock, FiChevronDown, FiChevronUp, FiRefreshCw
} from 'react-icons/fi';

const STATUS_COLORS = {
  pending_payment: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  dispatched: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_ICONS = {
  pending_payment: <FiClock size={14} />,
  paid: <FiCheckCircle size={14} />,
  processing: <FiPackage size={14} />,
  dispatched: <FiTruck size={14} />,
  delivered: <FiCheckCircle size={14} />,
  cancelled: <FiXCircle size={14} />,
};

function OrderRow({ order, onRefresh, isAdmin }) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({ show: false, tracking: '' });
  const [loading, setLoading] = useState(false);

  const isSeller = user?.role === 'seller' || user?.role === 'admin';

  const handleConfirmPayment = async () => {
    if (!window.confirm('Confirm payment for this order?')) return;
    setLoading(true);
    try {
      await orderAPI.confirmPayment(order._id, { paymentMethod: 'bank_transfer' });
      toast.success('Payment confirmed & vendor notified via WhatsApp');
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  const handleDispatch = async () => {
    if (!dispatchForm.tracking.trim()) return toast.error('Enter tracking number');
    setLoading(true);
    try {
      await orderAPI.dispatch(order._id, { trackingInfo: dispatchForm.tracking });
      toast.success('Order dispatched & buyer notified via WhatsApp');
      setDispatchForm({ show: false, tracking: '' });
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  const handleDeliver = async () => {
    if (!window.confirm('Mark this order as delivered?')) return;
    setLoading(true);
    try {
      await orderAPI.deliver(order._id);
      toast.success('Order marked delivered & buyer notified via WhatsApp');
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Reason for cancellation:');
    if (reason === null) return;
    setLoading(true);
    try {
      await orderAPI.cancel(order._id, { reason: reason || 'Cancelled by admin' });
      toast.success('Order cancelled & parties notified via WhatsApp');
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  return (
    <div className="card mb-3 overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`flex items-center gap-1 badge text-xs ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
          {STATUS_ICONS[order.status]} {order.status.replace(/_/g, ' ').toUpperCase()}
        </div>
        <div className="flex-grow min-w-0">
          <p className="font-semibold text-gray-800 text-sm">{order.orderNumber}</p>
          <p className="text-xs text-gray-500">
            {order.product?.name} • ₹{order.total?.toFixed(2)}
          </p>
        </div>
        <div className="text-right text-xs text-gray-500 hidden sm:block">
          <p>{order.buyer?.name}</p>
          <p>{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
        </div>
        {expanded ? <FiChevronUp className="text-gray-400 flex-shrink-0" /> : <FiChevronDown className="text-gray-400 flex-shrink-0" />}
      </div>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3">
          <div className="grid sm:grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-500 text-xs mb-1">Buyer</p>
              <p className="font-medium">{order.buyer?.name}</p>
              <p className="text-gray-500">{order.buyer?.phone || order.buyer?.email}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Vendor</p>
              <p className="font-medium">{order.seller?.businessName || order.seller?.name}</p>
              <p className="text-gray-500">{order.seller?.phone}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Payment</p>
              <p className="font-medium capitalize">{order.paymentStatus}</p>
              {order.paymentConfirmedAt && <p className="text-gray-400 text-xs">{new Date(order.paymentConfirmedAt).toLocaleDateString('en-IN')}</p>}
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Tracking</p>
              <p className="font-medium">{order.trackingInfo || 'Not dispatched'}</p>
              {order.dispatchedAt && <p className="text-gray-400 text-xs">Dispatched: {new Date(order.dispatchedAt).toLocaleDateString('en-IN')}</p>}
            </div>
          </div>

          {order.items?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Items</p>
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span className="text-gray-700">{item.description} ({item.quantity} {item.unit})</span>
                  <span className="font-medium">₹{item.total?.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold mt-2 pt-2">
                <span>Total</span>
                <span>₹{order.total?.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Actions for seller/admin */}
          {isSeller && (
            <div className="flex flex-wrap gap-2">
              {order.status === 'pending_payment' && (
                <button onClick={handleConfirmPayment} disabled={loading} className="btn-primary text-xs py-1.5 px-3 disabled:opacity-60">
                  ✅ Confirm Payment
                </button>
              )}
              {['paid', 'processing'].includes(order.status) && !dispatchForm.show && (
                <button onClick={() => setDispatchForm({ show: true, tracking: '' })} disabled={loading} className="bg-orange-500 text-white text-xs py-1.5 px-3 rounded font-medium hover:bg-orange-600 transition-colors disabled:opacity-60">
                  🚚 Mark Dispatched
                </button>
              )}
              {dispatchForm.show && (
                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    value={dispatchForm.tracking}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, tracking: e.target.value })}
                    className="input flex-grow text-sm"
                    placeholder="Enter tracking number..."
                    onKeyDown={(e) => e.key === 'Enter' && handleDispatch()}
                  />
                  <button onClick={handleDispatch} disabled={loading} className="btn-primary text-xs px-3 disabled:opacity-60">
                    {loading ? <FiRefreshCw className="animate-spin" /> : 'Dispatch'}
                  </button>
                  <button onClick={() => setDispatchForm({ show: false, tracking: '' })} className="btn-secondary text-xs px-3">Cancel</button>
                </div>
              )}
              {order.status === 'dispatched' && (
                <button onClick={handleDeliver} disabled={loading} className="btn-primary text-xs py-1.5 px-3 disabled:opacity-60">
                  📦 Mark Delivered
                </button>
              )}
              {!['delivered', 'cancelled'].includes(order.status) && (
                <button onClick={handleCancel} disabled={loading} className="bg-red-500 text-white text-xs py-1.5 px-3 rounded font-medium hover:bg-red-600 transition-colors disabled:opacity-60">
                  Cancel Order
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ManageOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState(null);

  const isAdmin = user?.role === 'admin';

  const load = useCallback(() => {
    setLoading(true);
    const fetcher = isAdmin ? orderAPI.getAllOrders : orderAPI.getVendorOrders;
    fetcher({ status: statusFilter, page }).then((r) => {
      setOrders(r.data.orders || []);
      setPages(r.data.pages || 1);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isAdmin, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isAdmin) {
      orderAPI.getStats().then((r) => setStats(r.data)).catch(() => {});
    }
  }, [isAdmin]);

  const statuses = ['', 'pending_payment', 'paid', 'processing', 'dispatched', 'delivered', 'cancelled'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">
          {isAdmin ? 'All Orders' : 'Vendor Orders'}
        </h1>
        <button onClick={load} className="btn-secondary text-sm flex items-center gap-1">
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {isAdmin && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'gray' },
            { label: 'Pending', value: stats.pending, color: 'yellow' },
            { label: 'Dispatched', value: stats.dispatched, color: 'orange' },
            { label: 'Delivered', value: stats.delivered, color: 'green' },
          ].map((s) => (
            <div key={s.label} className="card p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              statusFilter === s ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-600'
            }`}
          >
            {s ? s.replace(/_/g, ' ').toUpperCase() : 'All'}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : orders.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <FiPackage size={40} className="mx-auto mb-2 opacity-40" />
          <p>No orders found</p>
        </div>
      ) : (
        orders.map((order) => (
          <OrderRow key={order._id} order={order} onRefresh={load} isAdmin={isAdmin} />
        ))
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
