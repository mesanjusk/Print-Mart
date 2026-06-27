import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Truck, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from 'lucide-react';
import { orderAPI, quotationAPI } from '../../services/api';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
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

const STATUS_STEPS = ['pending_payment', 'paid', 'processing', 'dispatched', 'delivered'];
const STEP_LABELS = ['Payment Pending', 'Paid', 'Processing', 'Dispatched', 'Delivered'];

function OrderTimeline({ status }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-1.5 text-destructive text-xs font-medium">
        <XCircle className="h-3.5 w-3.5" /> Order Cancelled
      </div>
    );
  }
  const current = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {STATUS_STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className={cn(
            'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
            i < current ? 'bg-emerald-500 text-white' :
            i === current ? 'bg-primary-600 text-white ring-2 ring-primary-200 dark:ring-primary-800' :
            'bg-muted text-muted-foreground'
          )}>
            {i < current ? '✓' : i + 1}
          </div>
          <span className={cn('text-xs hidden sm:block', i <= current ? 'text-foreground font-medium' : 'text-muted-foreground')}>
            {STEP_LABELS[i]}
          </span>
          {i < STATUS_STEPS.length - 1 && (
            <div className={cn('h-0.5 w-4 sm:w-6', i < current ? 'bg-emerald-500' : 'bg-border')} />
          )}
        </div>
      ))}
    </div>
  );
}

function OrderCard({ order, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const canCancel = !['delivered', 'dispatched', 'cancelled'].includes(order.status);

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    setLoading(true);
    try {
      await orderAPI.cancel(order._id, { reason: 'Cancelled by buyer' });
      toast.success('Order cancelled');
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.message || 'Cannot cancel order'); } finally { setLoading(false); }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Badge variant={STATUS_VARIANT[order.status] || 'secondary'} className="text-2xs flex-shrink-0 capitalize gap-1">
          {order.status === 'delivered' ? <CheckCircle2 className="h-3 w-3" /> :
           order.status === 'dispatched' ? <Truck className="h-3 w-3" /> :
           order.status === 'cancelled' ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          {order.status.replace(/_/g, ' ')}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">{order.orderNumber}</p>
          <p className="text-xs text-muted-foreground truncate">{order.product?.name} · ₹{order.total?.toFixed(2)}</p>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block flex-shrink-0">
          {new Date(order.createdAt).toLocaleDateString('en-IN')}
        </p>
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
            <div className="px-4 pb-4 pt-3 space-y-4">
              <OrderTimeline status={order.status} />

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Vendor</p>
                  <p className="font-medium text-foreground">{order.seller?.businessName || order.seller?.name}</p>
                  <p className="text-xs text-muted-foreground">{order.seller?.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Payment</p>
                  <p className={cn('font-medium capitalize', order.paymentStatus === 'paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                    {order.paymentStatus}
                  </p>
                </div>
                {order.trackingInfo && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Tracking</p>
                    <p className="font-mono text-sm font-medium text-foreground">{order.trackingInfo}</p>
                  </div>
                )}
                {order.deliveredAt && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Delivered On</p>
                    <p className="font-medium text-emerald-600">{new Date(order.deliveredAt).toLocaleDateString('en-IN')}</p>
                  </div>
                )}
              </div>

              {order.items?.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm px-3 py-2 border-b border-border/50 last:border-0">
                      <span className="text-foreground">{item.description}</span>
                      <span className="text-muted-foreground text-xs">{item.quantity} {item.unit} × ₹{item.unitPrice} = ₹{item.total?.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold text-sm px-3 py-2 bg-muted/50">
                    <span>Total Paid</span>
                    <span className="text-emerald-600 dark:text-emerald-400">₹{order.total?.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {order.status === 'pending_payment' && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-3">
                  <p className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5 text-sm mb-1">
                    <AlertCircle className="h-4 w-4" /> Payment Instructions
                  </p>
                  <p className="text-amber-700 dark:text-amber-400 text-xs">
                    Pay <strong>₹{order.total?.toFixed(2)}</strong> via bank transfer then confirm on WhatsApp:
                  </p>
                  <code className="block mt-2 bg-card border border-border rounded-lg px-3 py-2 text-primary-600 dark:text-primary-400 font-mono text-sm">
                    PAID {order.orderNumber}
                  </code>
                </div>
              )}

              {canCancel && (
                <button onClick={handleCancel} disabled={loading} className="text-xs text-destructive hover:underline disabled:opacity-60">
                  Cancel this order
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PendingQuotations({ onOrderCreated }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    quotationAPI.getBuyerQuotations().then((r) => {
      setQuotes((r.data || []).filter((q) => q.status === 'sent'));
    }).catch(() => {}).finally(() => setLoading(false));
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

  if (loading || !quotes.length) return null;

  return (
    <div className="mb-6">
      <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="h-2 w-2 bg-amber-400 rounded-full animate-pulse" />
        Pending Quotations ({quotes.length})
      </p>
      {quotes.map((q) => {
        const shortId = String(q._id).slice(-6).toUpperCase();
        return (
          <div key={q._id} className="rounded-xl border-l-4 border-l-amber-400 border-y border-r border-border bg-card p-4 mb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">Q-{shortId} from {q.seller?.businessName || q.seller?.name}</p>
                <p className="text-sm text-muted-foreground">{q.product?.name} · ₹{q.total?.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Valid until {q.validUntil ? new Date(q.validUntil).toLocaleDateString('en-IN') : 'N/A'}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" loading={acting === q._id} onClick={() => handleAccept(q)} className="text-xs">
                  {acting !== q._id && '✓ Accept'}
                </Button>
                <Button size="sm" variant="destructive" disabled={!!acting} onClick={() => handleReject(q)} className="text-xs">
                  ✗ Reject
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const STATUSES = ['', 'pending_payment', 'paid', 'processing', 'dispatched', 'delivered', 'cancelled'];

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
    }).catch(() => {}).finally(() => setLoading(false));
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{orders.length} orders</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <PendingQuotations onOrderCreated={() => setRefreshKey((k) => k + 1)} />

      <div className="rounded-xl border border-primary-200 dark:border-primary-800/40 bg-primary-50/50 dark:bg-primary-950/20 px-4 py-3 mb-5 text-sm">
        <p className="font-medium text-foreground">Manage orders via WhatsApp</p>
        <p className="text-muted-foreground text-xs mt-0.5">
          Send <code className="bg-card border border-border rounded px-1 text-primary-600">ACCEPT</code> to accept a quotation,&nbsp;
          <code className="bg-card border border-border rounded px-1 text-primary-600">PAID PM-xxxx</code> to confirm payment,&nbsp;
          <code className="bg-card border border-border rounded px-1 text-primary-600">TRACK PM-xxxx</code> to track an order.
        </p>
      </div>

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
          <h3 className="text-lg font-semibold text-foreground mb-1">No orders yet</h3>
          <p className="text-muted-foreground text-sm">Browse products and send inquiries to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => <OrderCard key={order._id} order={order} onRefresh={load} />)}
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
