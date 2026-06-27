import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Truck, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { orderAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { StatCard } from '../ui/stat-card';
import Spinner from '../common/Spinner';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

const STATUS_VARIANT = {
  pending_payment: 'warning',
  paid: 'info',
  processing: 'purple',
  dispatched: 'warning',
  delivered: 'success',
  cancelled: 'destructive',
};

const STATUS_ICON = {
  pending_payment: <Clock className="h-3.5 w-3.5" />,
  paid: <CheckCircle2 className="h-3.5 w-3.5" />,
  processing: <Package className="h-3.5 w-3.5" />,
  dispatched: <Truck className="h-3.5 w-3.5" />,
  delivered: <CheckCircle2 className="h-3.5 w-3.5" />,
  cancelled: <XCircle className="h-3.5 w-3.5" />,
};

function OrderRow({ order, onRefresh }) {
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
      toast.success('Order marked delivered & buyer notified');
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Reason for cancellation:');
    if (reason === null) return;
    setLoading(true);
    try {
      await orderAPI.cancel(order._id, { reason: reason || 'Cancelled by admin' });
      toast.success('Order cancelled & parties notified');
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Badge variant={STATUS_VARIANT[order.status] || 'secondary'} className="text-2xs gap-1 flex-shrink-0 capitalize">
          {STATUS_ICON[order.status]}
          {order.status.replace(/_/g, ' ')}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">{order.orderNumber}</p>
          <p className="text-xs text-muted-foreground truncate">
            {order.product?.name} · ₹{order.total?.toFixed(2)}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground hidden sm:block">
          <p className="font-medium text-foreground">{order.buyer?.name}</p>
          <p>{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border/50 overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3">
              <div className="grid sm:grid-cols-2 gap-4 text-sm mb-4">
                {[
                  { label: 'Buyer', primary: order.buyer?.name, secondary: order.buyer?.phone || order.buyer?.email },
                  { label: 'Vendor', primary: order.seller?.businessName || order.seller?.name, secondary: order.seller?.phone },
                  { label: 'Payment', primary: order.paymentStatus, secondary: order.paymentConfirmedAt ? new Date(order.paymentConfirmedAt).toLocaleDateString('en-IN') : null },
                  { label: 'Tracking', primary: order.trackingInfo || 'Not dispatched', secondary: order.dispatchedAt ? `Dispatched: ${new Date(order.dispatchedAt).toLocaleDateString('en-IN')}` : null },
                ].map(({ label, primary, secondary }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className="font-medium text-foreground capitalize">{primary}</p>
                    {secondary && <p className="text-xs text-muted-foreground">{secondary}</p>}
                  </div>
                ))}
              </div>

              {order.items?.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden mb-4">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm px-3 py-2 border-b border-border/50 last:border-0">
                      <span className="text-foreground">{item.description} ({item.quantity} {item.unit})</span>
                      <span className="font-medium text-foreground">₹{item.total?.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold px-3 py-2 bg-muted/50">
                    <span>Total</span>
                    <span>₹{order.total?.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {isSeller && (
                <div className="flex flex-wrap gap-2">
                  {order.status === 'pending_payment' && (
                    <Button size="sm" loading={loading} onClick={handleConfirmPayment} className="text-xs">
                      {!loading && '✅ Confirm Payment'}
                    </Button>
                  )}
                  {['paid', 'processing'].includes(order.status) && !dispatchForm.show && (
                    <Button size="sm" variant="warning" loading={loading} onClick={() => setDispatchForm({ show: true, tracking: '' })} className="text-xs">
                      {!loading && <><Truck className="h-3.5 w-3.5" /> Mark Dispatched</>}
                    </Button>
                  )}
                  {dispatchForm.show && (
                    <div className="flex gap-2 w-full">
                      <input
                        type="text"
                        value={dispatchForm.tracking}
                        onChange={(e) => setDispatchForm({ ...dispatchForm, tracking: e.target.value })}
                        className="input flex-1 text-sm"
                        placeholder="Enter tracking number..."
                        onKeyDown={(e) => e.key === 'Enter' && handleDispatch()}
                      />
                      <Button size="sm" loading={loading} onClick={handleDispatch} className="text-xs">
                        {!loading && 'Dispatch'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDispatchForm({ show: false, tracking: '' })} className="text-xs">Cancel</Button>
                    </div>
                  )}
                  {order.status === 'dispatched' && (
                    <Button size="sm" loading={loading} onClick={handleDeliver} className="text-xs">
                      {!loading && <><Package className="h-3.5 w-3.5" /> Mark Delivered</>}
                    </Button>
                  )}
                  {!['delivered', 'cancelled'].includes(order.status) && (
                    <Button size="sm" variant="destructive" loading={loading} onClick={handleCancel} className="text-xs">
                      {!loading && 'Cancel Order'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const STATUSES = ['', 'pending_payment', 'paid', 'processing', 'dispatched', 'delivered', 'cancelled'];

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
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isAdmin, statusFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (isAdmin) orderAPI.getStats().then((r) => setStats(r.data)).catch(() => {});
  }, [isAdmin]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{isAdmin ? 'All Orders' : 'Vendor Orders'}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{orders.length} orders</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {isAdmin && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { title: 'Total Orders', value: stats.total },
            { title: 'Pending', value: stats.pending },
            { title: 'Dispatched', value: stats.dispatched },
            { title: 'Delivered', value: stats.delivered },
          ].map((s) => (
            <div key={s.title} className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.title}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border font-medium transition-all',
              statusFilter === s
                ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                : 'border-border text-muted-foreground hover:border-primary-400 hover:text-foreground bg-card'
            )}
          >
            {s ? s.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner size="lg" /></div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Package className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No orders found</h3>
          <p className="text-muted-foreground text-sm">Orders will appear here when placed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderRow key={order._id} order={order} onRefresh={load} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</Button>
          <span className="text-sm text-muted-foreground self-center">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next →</Button>
        </div>
      )}
    </div>
  );
}
