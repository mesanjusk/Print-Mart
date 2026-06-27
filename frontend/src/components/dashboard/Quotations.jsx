import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { quotationAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import Spinner from '../common/Spinner';
import toast from 'react-hot-toast';

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const STATUS_VARIANT = {
  draft: 'secondary',
  sent: 'info',
  accepted: 'success',
  rejected: 'destructive',
  expired: 'warning',
};

export default function Quotations() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const { data } = user?.role === 'seller'
        ? await quotationAPI.getSellerQuotations()
        : await quotationAPI.getBuyerQuotations();
      setQuotations(Array.isArray(data) ? data : []);
    } catch {
      setQuotations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuotations(); }, []);

  const handleSendWhatsApp = async (id) => {
    try {
      await quotationAPI.sendWhatsApp(id);
      toast.success('Quotation sent via WhatsApp!');
      fetchQuotations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send on WhatsApp');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await quotationAPI.updateStatus(id, status);
      toast.success(`Quotation ${status}`);
      fetchQuotations();
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Quotations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{quotations.length} quotation{quotations.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner size="lg" /></div>
      ) : quotations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FileText className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No quotations yet</h3>
          <p className="text-muted-foreground text-sm">Quotations from sellers will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotations.map((q) => {
            const isExpanded = expanded === q._id;
            return (
              <motion.div
                key={q._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-foreground text-sm">{q.product?.name || 'Product'}</h3>
                      <Badge variant={STATUS_VARIANT[q.status] || 'secondary'} className="text-2xs capitalize">
                        {q.status}
                      </Badge>
                      {q.whatsappSent && (
                        <Badge className="text-2xs bg-[#25D366] text-white border-0">WhatsApp Sent</Badge>
                      )}
                    </div>
                    <p className="text-primary-600 dark:text-primary-400 font-bold text-base">
                      ₹{q.total?.toLocaleString()}
                      <span className="text-muted-foreground font-normal text-xs ml-2">(incl. {q.tax}% tax)</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Valid until: {new Date(q.validUntil).toLocaleDateString()} ·{' '}
                      {user?.role === 'seller'
                        ? `Buyer: ${q.buyer?.name}`
                        : `From: ${q.seller?.businessName || q.seller?.name}`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpanded(isExpanded ? null : q._id)}
                    className="flex-shrink-0 gap-1 text-xs"
                  >
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {isExpanded ? 'Hide' : 'Details'}
                  </Button>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 border-t border-border/50 pt-4 overflow-hidden"
                    >
                      {q.items?.length > 0 && (
                        <div className="rounded-lg border border-border overflow-hidden mb-4">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr className="text-left text-muted-foreground text-xs">
                                <th className="px-3 py-2 font-medium">Item</th>
                                <th className="px-3 py-2 font-medium text-right">Qty</th>
                                <th className="px-3 py-2 font-medium text-right">Unit Price</th>
                                <th className="px-3 py-2 font-medium text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {q.items.map((item, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 text-foreground">{item.description}</td>
                                  <td className="px-3 py-2 text-right text-muted-foreground">{item.quantity} {item.unit}</td>
                                  <td className="px-3 py-2 text-right text-muted-foreground">₹{item.unitPrice?.toLocaleString()}</td>
                                  <td className="px-3 py-2 text-right font-medium text-foreground">₹{item.total?.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-muted/30 border-t border-border/50">
                              <tr>
                                <td colSpan={3} className="px-3 py-1.5 text-right text-xs text-muted-foreground">Subtotal</td>
                                <td className="px-3 py-1.5 text-right text-sm">₹{q.subtotal?.toLocaleString()}</td>
                              </tr>
                              <tr>
                                <td colSpan={3} className="px-3 py-1 text-right text-xs text-muted-foreground">Tax ({q.tax}%)</td>
                                <td className="px-3 py-1 text-right text-sm">₹{q.taxAmount?.toLocaleString()}</td>
                              </tr>
                              <tr className="font-bold text-primary-600 dark:text-primary-400">
                                <td colSpan={3} className="px-3 py-2 text-right">Total</td>
                                <td className="px-3 py-2 text-right">₹{q.total?.toLocaleString()}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}

                      {q.notes && (
                        <p className="text-xs text-muted-foreground italic mb-4 px-1">Note: {q.notes}</p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {user?.role === 'seller' && q.status === 'draft' && (
                          <button
                            onClick={() => handleSendWhatsApp(q._id)}
                            className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20b858] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {WA_ICON} Send via WhatsApp
                          </button>
                        )}
                        {user?.role === 'buyer' && q.status === 'sent' && (
                          <>
                            <Button size="sm" variant="success" onClick={() => handleUpdateStatus(q._id, 'accepted')} className="gap-1 text-xs">
                              <Check className="h-3.5 w-3.5" /> Accept
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(q._id, 'rejected')} className="gap-1 text-xs">
                              <X className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
