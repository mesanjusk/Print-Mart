import { useState, useEffect } from 'react';
import { quotationAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../common/Spinner';
import toast from 'react-hot-toast';
import { FiSend, FiCheck, FiX, FiMessageSquare } from 'react-icons/fi';

const statusColor = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-yellow-100 text-yellow-700',
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
      <h1 className="text-xl font-bold text-gray-800 mb-4">Quotations</h1>
      {loading ? <Spinner /> : quotations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>No quotations yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotations.map((q) => (
            <div key={q._id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="flex-grow">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-medium text-gray-800 text-sm">{q.product?.name || 'Product'}</h3>
                    <span className={`badge ${statusColor[q.status]}`}>{q.status}</span>
                    {q.whatsappSent && (
                      <span className="badge bg-[#25D366] text-white text-xs">WhatsApp Sent</span>
                    )}
                  </div>
                  <p className="text-green-600 font-bold text-base">
                    ₹{q.total?.toLocaleString()}
                    <span className="text-gray-400 font-normal text-xs ml-2">
                      (incl. {q.tax}% tax)
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Valid until: {new Date(q.validUntil).toLocaleDateString()} •{' '}
                    {user?.role === 'seller'
                      ? `Buyer: ${q.buyer?.name}`
                      : `From: ${q.seller?.businessName || q.seller?.name}`}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setExpanded(expanded === q._id ? null : q._id)}
                    className="text-xs text-green-600 hover:text-green-700 border border-green-300 px-2 py-1 rounded">
                    {expanded === q._id ? 'Hide' : 'Details'}
                  </button>
                </div>
              </div>

              {expanded === q._id && (
                <div className="mt-3 border-t pt-3">
                  {q.items?.length > 0 && (
                    <table className="w-full text-sm mb-3">
                      <thead>
                        <tr className="text-left text-gray-500 text-xs border-b">
                          <th className="pb-1">Item</th>
                          <th className="pb-1 text-right">Qty</th>
                          <th className="pb-1 text-right">Unit Price</th>
                          <th className="pb-1 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {q.items.map((item, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="py-1">{item.description}</td>
                            <td className="py-1 text-right">{item.quantity} {item.unit}</td>
                            <td className="py-1 text-right">₹{item.unitPrice?.toLocaleString()}</td>
                            <td className="py-1 text-right font-medium">₹{item.total?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="text-sm">
                          <td colSpan={3} className="pt-2 text-right text-gray-500">Subtotal</td>
                          <td className="pt-2 text-right">₹{q.subtotal?.toLocaleString()}</td>
                        </tr>
                        <tr className="text-sm">
                          <td colSpan={3} className="text-right text-gray-500">Tax ({q.tax}%)</td>
                          <td className="text-right">₹{q.taxAmount?.toLocaleString()}</td>
                        </tr>
                        <tr className="font-bold text-green-700">
                          <td colSpan={3} className="text-right pt-1">Total</td>
                          <td className="text-right pt-1">₹{q.total?.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                  {q.notes && <p className="text-xs text-gray-500 italic mb-3">Note: {q.notes}</p>}

                  <div className="flex flex-wrap gap-2">
                    {user?.role === 'seller' && q.status === 'draft' && (
                      <button onClick={() => handleSendWhatsApp(q._id)}
                        className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20b858] text-white text-xs font-semibold px-3 py-1.5 rounded">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        Send via WhatsApp
                      </button>
                    )}
                    {user?.role === 'buyer' && q.status === 'sent' && (
                      <>
                        <button onClick={() => handleUpdateStatus(q._id, 'accepted')}
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded">
                          <FiCheck size={12} /> Accept
                        </button>
                        <button onClick={() => handleUpdateStatus(q._id, 'rejected')}
                          className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded">
                          <FiX size={12} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
