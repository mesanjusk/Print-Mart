import { useState, useEffect } from 'react';
import { FiCheckCircle, FiMessageCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { inquiryAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../common/Spinner';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'https://print-mart-dv0h.onrender.com/api';

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const statusColor = {
  pending: 'bg-yellow-100 text-yellow-700',
  responded: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
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
      toast.success('Accepted! Buyer has been notified via push notification.');
      // Update local state
      setInquiries((prev) =>
        prev.map((inq) =>
          inq._id === inqId
            ? { ...inq, sellerInterests: data.sellerInterests }
            : inq
        )
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
      <h1 className="text-xl font-bold text-gray-800 mb-4">Inquiries</h1>

      {user?.role === 'seller' && (
        <div className="flex gap-2 mb-4">
          {['buyer', 'seller'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-green-600 text-white'
                  : 'bg-white border text-gray-600 hover:border-green-500'
              }`}
            >
              {tab === 'buyer' ? 'My Inquiries' : 'Leads Received'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : inquiries.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">💬</p>
          <p>{activeTab === 'seller' ? 'No leads yet. Enable push notifications to get alerted instantly.' : 'No inquiries yet'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => {
            const iAmSeller = user?.role === 'seller' && activeTab === 'seller';
            const alreadyAccepted = hasAccepted(inq);

            return (
              <div key={inq._id} className={`card p-4 ${iAmSeller && !alreadyAccepted && inq.status === 'pending' ? 'border-amber-200' : ''}`}>
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-medium text-gray-800 text-sm">{inq.product?.name || inq.productName || 'Unknown Product'}</h3>
                      <span className={`badge ${statusColor[inq.status]}`}>{inq.status}</span>
                      {inq.isUnmatched && (
                        <span className="badge bg-orange-100 text-orange-700">no sellers yet</span>
                      )}
                      {inq.sellerInterests?.length > 0 && (
                        <span className="badge bg-green-100 text-green-700">
                          {inq.sellerInterests.length} seller{inq.sellerInterests.length !== 1 ? 's' : ''} ready
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{inq.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Qty: {inq.quantity} {inq.unit}
                      {iAmSeller && inq.buyer?.name && ` • Buyer: ${inq.buyer.name}`}
                      {` • ${new Date(inq.createdAt).toLocaleDateString()}`}
                    </p>
                    {inq.designFileUrl && (
                      <a href={inq.designFileUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-green-600 hover:underline mt-1 inline-block">
                        📎 Design file attached
                      </a>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {/* Seller: Accept button */}
                    {iAmSeller && inq.status !== 'closed' && (
                      alreadyAccepted ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium px-2 py-1.5 bg-green-50 rounded">
                          <FiCheckCircle size={13} /> Accepted
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAccept(inq._id)}
                          disabled={accepting === inq._id}
                          className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50 font-medium"
                        >
                          {accepting === inq._id ? 'Accepting...' : '✓ Accept Lead'}
                        </button>
                      )
                    )}
                    {/* After seller accepts — direct WhatsApp to buyer (buyer initiates back = free) */}
                    {iAmSeller && alreadyAccepted && inq.buyer?.phone && (
                      <a
                        href={waLink(inq.buyer.phone, `Hi, I am ${user.businessName || user.name} from PrintMart. I can help with your ${inq.product?.name} order (${inq.quantity} ${inq.unit}). When would you like to discuss?`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs bg-[#25D366] text-white px-2.5 py-1.5 rounded hover:bg-[#20b858] font-medium"
                      >
                        {WA_ICON} WhatsApp Buyer
                      </a>
                    )}

                    <button
                      onClick={() => setExpanded(expanded === inq._id ? null : inq._id)}
                      className="text-xs text-gray-500 hover:text-green-600 flex items-center gap-0.5"
                    >
                      {expanded === inq._id ? <><FiChevronUp size={13} /> Hide</> : <><FiChevronDown size={13} /> Details</>}
                    </button>
                  </div>
                </div>

                {/* Buyer view: sellers who accepted with WhatsApp buttons */}
                {!iAmSeller && inq.sellerInterests?.length > 0 && (
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-800 mb-2">
                      🎉 {inq.sellerInterests.length} seller{inq.sellerInterests.length !== 1 ? 's' : ''} ready to fulfil your order
                    </p>
                    <div className="space-y-2">
                      {inq.sellerInterests.map((si, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white rounded px-3 py-2 border border-green-100">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{si.sellerBusiness || si.sellerName}</p>
                            <p className="text-xs text-gray-400">Ready since {new Date(si.acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <a
                            href={sellerChatUrl(inq._id, idx)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs bg-[#25D366] text-white px-3 py-1.5 rounded hover:bg-[#20b858] font-medium"
                          >
                            {WA_ICON} Chat Now
                          </a>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Tap "Chat Now" to WhatsApp each seller directly. Compare prices before placing order.
                    </p>
                  </div>
                )}

                {/* Expanded thread */}
                {expanded === inq._id && (
                  <div className="mt-3 border-t pt-3 space-y-2">
                    {inq.replies?.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">No messages yet</p>
                    )}
                    {inq.replies?.map((r, i) => (
                      <div key={i} className={`text-sm p-2.5 rounded-lg ${r.sender === user?._id ? 'bg-green-50 ml-8' : 'bg-gray-50 mr-8'}`}>
                        <p className="text-gray-700">{r.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(r.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                    {inq.status !== 'closed' && (
                      <div className="flex gap-2 mt-2 pt-2">
                        <input
                          type="text"
                          value={replyText[inq._id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [inq._id]: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleReply(inq._id)}
                          placeholder="Type a message..."
                          className="input text-sm flex-grow"
                        />
                        <button onClick={() => handleReply(inq._id)} className="btn-primary text-sm px-3">
                          <FiMessageCircle size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
