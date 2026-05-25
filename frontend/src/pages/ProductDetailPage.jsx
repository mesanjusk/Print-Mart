import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { FiStar, FiMapPin, FiHeart, FiChevronLeft, FiGitBranch, FiImage, FiUpload } from 'react-icons/fi';
import { productAPI, inquiryAPI, designAPI, compareAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [inquiryForm, setInquiryForm] = useState({ message: '', quantity: 1, unit: 'pieces' });
  const [submitting, setSubmitting] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [myDesigns, setMyDesigns] = useState([]);
  const [selectedDesign, setSelectedDesign] = useState(location.state?.reorderDesign || null);
  const [showDesignPicker, setShowDesignPicker] = useState(false);

  useEffect(() => {
    productAPI.getBySlug(slug)
      .then((r) => setData(r.data))
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (user) {
      designAPI.getAll().then((r) => setMyDesigns(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }
  }, [user]);

  const handleInquiry = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Please login to send inquiry');
    setSubmitting(true);
    try {
      await inquiryAPI.create({
        productId: data.product._id,
        ...inquiryForm,
        designId: selectedDesign?._id,
        designFileUrl: selectedDesign?.fileUrl,
      });
      toast.success('Inquiry sent! Sellers will be notified via WhatsApp.');
      setInquiryForm({ message: '', quantity: 1, unit: 'pieces' });
      setSelectedDesign(null);
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
      <Link to="/products" className="text-sm text-gray-500 hover:text-green-600 flex items-center gap-1 mb-4">
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
                  className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${i === activeImg ? 'border-green-600' : 'border-gray-200'}`}>
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

          <p className="text-3xl font-bold text-green-600 mb-1">
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

          {/* Print specs chips */}
          {product.printSpecs && Object.values(product.printSpecs).some(Boolean) && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-800 mb-2">Print Specifications</h3>
              <div className="flex flex-wrap gap-2">
                {product.printSpecs.paperWeight && (
                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full">{product.printSpecs.paperWeight} gsm paper</span>
                )}
                {product.printSpecs.finish && (
                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full capitalize">{product.printSpecs.finish} finish</span>
                )}
                {product.printSpecs.size && (
                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full">{product.printSpecs.size}</span>
                )}
                {product.printSpecs.sides && (
                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full capitalize">{product.printSpecs.sides}-sided</span>
                )}
                {product.printSpecs.quantity && (
                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full">{product.printSpecs.quantity} pcs</span>
                )}
                {product.printSpecs.deliveryDays && (
                  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">{product.printSpecs.deliveryDays}-day delivery</span>
                )}
                {product.printSpecs.material && (
                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full capitalize">{product.printSpecs.material}</span>
                )}
              </div>
              <Link
                to={`/compare?category=${product.category?._id || product.category}&quantity=${product.printSpecs.quantity || ''}&finish=${product.printSpecs.finish || ''}`}
                className="inline-flex items-center gap-1 text-xs text-green-600 hover:underline mt-2"
              >
                <FiGitBranch size={12} /> Compare prices from other sellers
              </Link>
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
              {/* Design attachment */}
              {user && (
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <FiImage size={14} /> Attach Design File
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDesignPicker(!showDesignPicker)}
                      className="text-xs text-green-600 hover:underline"
                    >
                      {showDesignPicker ? 'Hide' : myDesigns.length > 0 ? `My Library (${myDesigns.length})` : 'Upload'}
                    </button>
                  </div>

                  {selectedDesign && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded px-3 py-2 mb-2">
                      <FiImage size={14} className="text-green-600 flex-shrink-0" />
                      <span className="text-sm text-green-800 truncate flex-grow">{selectedDesign.name}</span>
                      <button type="button" onClick={() => setSelectedDesign(null)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                    </div>
                  )}

                  {showDesignPicker && (
                    <div>
                      {myDesigns.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-2">
                          No designs saved. <Link to="/dashboard/designs" className="text-green-600 hover:underline">Upload from Design Library</Link>
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                          {myDesigns.map((d) => (
                            <button
                              key={d._id}
                              type="button"
                              onClick={() => { setSelectedDesign(d); setShowDesignPicker(false); }}
                              className={`border rounded p-1.5 text-left hover:border-green-400 transition-colors ${selectedDesign?._id === d._id ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                            >
                              <p className="text-xs font-medium text-gray-700 truncate">{d.name}</p>
                              {d.category && <p className="text-xs text-gray-400 capitalize">{d.category.replace(/-/g, ' ')}</p>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Sending...' : 'Send Inquiry'}
              </button>
              <a
                href={`https://wa.me/91${product.seller?.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in ${product.name}. Please send me a quotation.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20b858] text-white font-semibold py-2.5 rounded mt-2"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Chat on WhatsApp
              </a>
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
              <form onSubmit={handleReview} className="bg-green-50 p-4 rounded-lg mb-4 space-y-3">
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
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm">
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
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-lg">
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
