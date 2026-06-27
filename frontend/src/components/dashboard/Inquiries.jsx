import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ChevronDown, ChevronUp, CheckCircle2, Paperclip, Send } from 'lucide-react';
import { inquiryAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import Spinner from '../common/Spinner';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

const API_BASE = import.meta.env.VITE_API_URL || 'https://print-mart-dv0h.onrender.com/api';

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const STATUS_VARIANT = {
  pending: 'warning',
  responded: 'success',
  closed: 'secondary',
};

function waLink(phone, text) {
  const cleaned = (phone || '').replace(/[^0-9]/g, '');
  const num = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

function sellerChatUrl(inqId, idx) {
  const token = localStorage.getItem('token') || '';
  return `${API_BASE}/inquiries/${inqId}/wa/${idx}?token=${encodeURIComponent(token)}`;
}

export default function Inquiries() {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('buyer');
  const [replyText, setReplyText] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [accepting, setAccepting] = useState(null);

  const fetchInquiries = async (tab) => {
    setLoading(true);
    try {
      const { data } = tab === 'buyer'
        ? await inquiryAPI.getBuyerInquiries()
        : await inquiryAPI.getSellerInquiries();
      setInquiries(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInquiries(activeTab); }, [activeTab]);

  const handleReply = async (id) => {
    if (!replyText[id]?.trim()) return;
    try {
      await inquiryAPI.reply(id, { message: replyText[id] });
      toast.success('Reply sent');
      setReplyText({ ...replyText, [id]: '' });
      fetchInquiries(activeTab);
    } catch {
      toast.error('Failed to send reply');
    }
  };

  const handleAccept = async (inqId) => {
    setAccepting(inqId);
    try {
      const { data } = await inquiryAPI.accept(inqId);
      toast.success('Accepted! Buyer has been notified.');
      setInquiries((prev) =>
        prev.map((inq) => inq._id === inqId ? { ...inq, sellerInterests: data.sellerInterests } : inq)
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept');
    } finally {
      setAccepting(null);
    }
  };

  const hasAccepted = (inq) =>
    inq.sellerInterests?.some((i) => (i.seller?._id || i.seller) === user?._id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Inquiries</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {activeTab === 'seller' ? 'Leads received from buyers' : 'Your product inquiries'}
        </p>
      </div>

      {user?.role === 'seller' && (
        <div className="flex gap-1.5 mb-5 p-1 bg-muted rounded-xl w-fit">
          {[{ key: 'buyer', label: 'My Inquiries' }, { key: 'seller', label: 'Leads Received' }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                activeTab === key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner size="lg" /></div>
      ) : inquiries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <MessageCircle className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {activeTab === 'seller' ? 'No leads yet' : 'No inquiries yet'}
          </h3>
          <p className="text-muted-foreground text-sm">
            {activeTab === 'seller' ? 'Enable push notifications to get alerted instantly.' : 'Browse products and send your first inquiry.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => {
            const iAmSeller = user?.role === 'seller' && activeTab === 'seller';
            const alreadyAccepted = hasAccepted(inq);
            const isExpanded = expanded === inq._id;

            return (
              <motion.div
                key={inq._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'rounded-xl border bg-card p-4 transition-colors',
                  iAmSeller && !alreadyAccepted && inq.status === 'pending'
                    ? 'border-amber-200 dark:border-amber-800/40'
                    : 'border-border'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-foreground text-sm truncate">
                        {inq.product?.name || inq.productName || 'Unknown Product'}
                      </h3>
                      <Badge variant={STATUS_VARIANT[inq.status] || 'secondary'} className="text-2xs capitalize">
                        {inq.status}
                      </Badge>
                      {inq.isUnmatched && (
                        <Badge variant="warning" className="text-2xs">no sellers yet</Badge>
                      )}
                      {inq.sellerInterests?.length > 0 && (
                        <Badge variant="success" className="text-2xs">
                          {inq.sellerInterests.length} seller{inq.sellerInterests.length !== 1 ? 's' : ''} ready
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-1">{inq.message}</p>
                    <p className="text-xs text-muted-foreground/70">
                      Qty: {inq.quantity} {inq.unit}
                      {iAmSeller && inq.buyer?.name && ` · Buyer: ${inq.buyer.name}`}
                      {' · '}{new Date(inq.createdAt).toLocaleDateString()}
                    </p>
                    {inq.designFileUrl && (
                      <a href={inq.designFileUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1">
                        <Paperclip className="h-3 w-3" /> Design file attached
                      </a>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
                    {iAmSeller && inq.status !== 'closed' && (
                      alreadyAccepted ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          loading={accepting === inq._id}
                          onClick={() => handleAccept(inq._id)}
                          className="text-xs"
                        >
                          {accepting !== inq._id && '✓ Accept Lead'}
                        </Button>
                      )
                    )}
                    {iAmSeller && alreadyAccepted && inq.buyer?.phone && (
                      <a
                        href={waLink(inq.buyer.phone, `Hi, I am ${user.businessName || user.name} from PrintMart. I can help with your ${inq.product?.name} order (${inq.quantity} ${inq.unit}). When would you like to discuss?`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs bg-[#25D366] hover:bg-[#20b858] text-white px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        {WA_ICON} WhatsApp Buyer
                      </a>
                    )}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : inq._id)}
                      className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {isExpanded ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>

                {/* Seller interests for buyer */}
                {!iAmSeller && inq.sellerInterests?.length > 0 && (
                  <div className="mt-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-3">
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                      🎉 {inq.sellerInterests.length} seller{inq.sellerInterests.length !== 1 ? 's' : ''} ready to fulfil your order
                    </p>
                    <div className="space-y-2">
                      {inq.sellerInterests.map((si, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white dark:bg-card rounded-lg px-3 py-2 border border-emerald-100 dark:border-emerald-800/30">
                          <div>
                            <p className="text-sm font-medium text-foreground">{si.sellerBusiness || si.sellerName}</p>
                            <p className="text-xs text-muted-foreground">Ready since {new Date(si.acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <a
                            href={sellerChatUrl(inq._id, idx)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs bg-[#25D366] hover:bg-[#20b858] text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                          >
                            {WA_ICON} Chat Now
                          </a>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Tap "Chat Now" to WhatsApp each seller directly. Compare prices before ordering.
                    </p>
                  </div>
                )}

                {/* Expanded reply thread */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 border-t border-border/50 pt-3 space-y-2 overflow-hidden"
                    >
                      {(!inq.replies || inq.replies.length === 0) && (
                        <p className="text-xs text-muted-foreground text-center py-2">No messages yet</p>
                      )}
                      {inq.replies?.map((r, i) => (
                        <div key={i} className={cn(
                          'text-sm p-3 rounded-lg',
                          r.sender === user?._id
                            ? 'bg-primary-50 dark:bg-primary-900/20 ml-8'
                            : 'bg-muted mr-8'
                        )}>
                          <p className="text-foreground">{r.message}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(r.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                      {inq.status !== 'closed' && (
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            value={replyText[inq._id] || ''}
                            onChange={(e) => setReplyText({ ...replyText, [inq._id]: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleReply(inq._id)}
                            placeholder="Type a message..."
                            className="input text-sm flex-1"
                          />
                          <Button size="icon" onClick={() => handleReply(inq._id)}>
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
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
