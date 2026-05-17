import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiStar, FiMapPin, FiPhone, FiMail, FiHeart, FiShare2, FiChevronLeft } from 'react-icons/fi';
import { productAPI, inquiryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [inquiryForm, setInquiryForm] = useState({ message: '', quantity: 1, unit: 'pieces' });
  const [submitting, setSubmitting] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    productAPI.getBySlug(slug)
      .then((r) => setData(r.data))
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleInquiry = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Please login to send inquiry');
    setSubmitting(true);
    try {
      await inquiryAPI.create({ productId: data.product._id, ...inquiryForm });
      toast.success('Inquiry sent successfully!');
      setInquiryForm({ message: '', quantity: 1, unit: 'pieces' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Please login to review');
    try {
      await productAPI.addReview(data.product._id, reviewForm);
      toast.success('Review submitted!');
      setShowReviewForm(false);
      const updated = await productAPI.getBySlug(slug);
      setData(updated.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    }
  };

  if (loading) return <div className="py-20"><Spinner size="lg" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-500">Product not found</div>;

  const { product, reviews } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link to="/products" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-4">
        <FiChevronLeft /> Back to Products
      </Link>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Images */}
        <div>
          <div className="card overflow-hidden h-80 mb-3">
            <img
              src={product.images?.[activeImg] || 'https://placehold.co/600x400?text=No+Image'}
              alt={product.name}
              className="w-full h-full object-contain p-4"
            />
          </div>
          {product.images?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${i === activeImg ? 'border-orange-500' : 'border-gray-200'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-800 flex-grow">{product.name}</h1>
            <button className="p-2 text-gray-400 hover:text-red-500"><FiHeart /></button>
          </div>

          {product.rating?.count > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex">
                {[1,2,3,4,5].map((s) => (
                  <FiStar key={s} size={14} className={s <= product.rating.average ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                ))}
              </div>
              <span className="text-sm text-gray-500">({product.rating.count} reviews)</span>
            </div>
          )}

          <p className="text-3xl font-bold text-orange-500 mb-1">
            ₹{product.price?.min?.toLocaleString()}
            {product.price?.max && ` – ₹${product.price.max.toLocaleString()}`}
          </p>
          <p className="text-sm text-gray-500 mb-4">Per {product.price?.unit} | Min. Order: {product.minOrderQty} {product.price?.unit}</p>

          {product.brand && <p className="text-sm text-gray-600 mb-2"><span className="font-medium">Brand:</span> {product.brand}</p>}

          <p className="text-gray-600 text-sm mb-4 leading-relaxed">{product.description}</p>

          {product.specifications?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-800 mb-2">Specifications</h3>
              <div className="grid grid-cols-2 gap-1 text-sm">
                {product.specifications.map((spec, i) => (
                  <div key={i} className="bg-gray-50 rounded p-2">
                    <span className="text-gray-500">{spec.key}: </span>
                    <span className="font-medium">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span key={tag} className="badge bg-gray-100 text-gray-600">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Inquiry Form */}
        <div className="md:col-span-2">
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Send Inquiry to Supplier</h2>
            <form onSubmit={handleInquiry} className="space-y-3">
              <textarea
                value={inquiryForm.message}
                onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                placeholder="Describe your requirement..."
                required
                rows={4}
                className="input resize-none"
              />
              <div className="flex gap-3">
                <input
                  type="number"
                  value={inquiryForm.quantity}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, quantity: e.target.value })}
                  min={1}
                  className="input w-24"
                  placeholder="Qty"
                />
                <select
                  value={inquiryForm.unit}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, unit: e.target.value })}
                  className="input flex-grow"
                >
                  {['pieces', 'kilograms', 'tonnes', 'liters', 'meters', 'boxes', 'units'].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Sending...' : 'Send Inquiry'}
              </button>
            </form>
          </div>

          {/* Reviews */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Reviews ({reviews.length})</h2>
              {user && (
                <button onClick={() => setShowReviewForm(!showReviewForm)} className="btn-secondary text-sm py-1.5">
                  Write Review
                </button>
              )}
            </div>

            {showReviewForm && (
              <form onSubmit={handleReview} className="bg-orange-50 p-4 rounded-lg mb-4 space-y-3">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map((s) => (
                    <button key={s} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: s })}>
                      <FiStar size={22} className={s <= reviewForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                    </button>
                  ))}
                </div>
                <textarea value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Share your experience..." rows={3} className="input resize-none" />
                <button type="submit" className="btn-primary text-sm py-1.5">Submit Review</button>
              </form>
            )}

            {reviews.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No reviews yet. Be the first!</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r._id} className="border-b pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">
                        {r.user?.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{r.user?.name}</span>
                      <div className="flex ml-auto">
                        {[1,2,3,4,5].map((s) => (
                          <FiStar key={s} size={12} className={s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-gray-600 pl-10">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Seller Card */}
        <div>
          <div className="card p-5 sticky top-20">
            <h3 className="font-bold text-gray-800 mb-3">Supplier Details</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-lg">
                {product.seller?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{product.seller?.businessName || product.seller?.name}</p>
                <p className="text-xs text-green-600 font-medium">Verified Supplier</p>
              </div>
            </div>
            {product.seller?.address?.city && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                <FiMapPin size={14} /> {product.seller.address.city}, {product.seller.address.state}
              </p>
            )}
            <Link to={`/suppliers/${product.seller?._id}`} className="btn-secondary w-full text-center block text-sm mt-3">
              View Supplier Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
