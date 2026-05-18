import { useState, useEffect } from 'react';
import { inquiryAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../common/Spinner';
import toast from 'react-hot-toast';

export default function Inquiries() {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('buyer');
  const [replyText, setReplyText] = useState({});
  const [expanded, setExpanded] = useState(null);

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

  const statusColor = { pending: 'bg-yellow-100 text-yellow-700', responded: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-600' };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Inquiries</h1>
      {user?.role === 'seller' && (
        <div className="flex gap-2 mb-4">
          {['buyer', 'seller'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded text-sm font-medium capitalize ${activeTab === tab ? 'bg-orange-500 text-white' : 'bg-white border text-gray-600 hover:border-orange-400'}`}>
              {tab === 'buyer' ? 'My Inquiries' : 'Received Inquiries'}
            </button>
          ))}
        </div>
      )}
      {loading ? <Spinner /> : inquiries.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">💬</p>
          <p>No inquiries yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => (
            <div key={inq._id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-medium text-gray-800 text-sm">{inq.product?.name}</h3>
                    <span className={`badge ${statusColor[inq.status]}`}>{inq.status}</span>
                  </div>
                  <p className="text-sm text-gray-600">{inq.message}</p>
                  <p className="text-xs text-gray-400 mt-1">Qty: {inq.quantity} {inq.unit} • {new Date(inq.createdAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => setExpanded(expanded === inq._id ? null : inq._id)}
                  className="text-xs text-orange-500 hover:text-orange-600 flex-shrink-0">
                  {expanded === inq._id ? 'Hide' : 'View'} Thread
                </button>
              </div>

              {expanded === inq._id && (
                <div className="mt-3 border-t pt-3 space-y-2">
                  {inq.replies?.map((r, i) => (
                    <div key={i} className={`text-sm p-2 rounded ${r.sender === user._id ? 'bg-orange-50 ml-8' : 'bg-gray-50'}`}>
                      <p className="text-gray-600">{r.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                  {inq.status !== 'closed' && (
                    <div className="flex gap-2 mt-2">
                      <input type="text" value={replyText[inq._id] || ''}
                        onChange={(e) => setReplyText({ ...replyText, [inq._id]: e.target.value })}
                        placeholder="Type a reply..." className="input text-sm flex-grow" />
                      <button onClick={() => handleReply(inq._id)} className="btn-primary text-sm px-3">Send</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
