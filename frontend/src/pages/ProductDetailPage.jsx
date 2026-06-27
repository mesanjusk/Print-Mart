import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, MapPin, Heart, ChevronLeft, GitCompare, Image,
  Package, Send, MessageCircle, BadgeCheck, Truck, Shield,
  X, ChevronRight, Plus, Minus
} from 'lucide-react';
import { productAPI, inquiryAPI, designAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar } from '../components/ui/avatar';
import { cn, formatDate } from '../lib/utils';

const UNITS = ['pieces', 'kilograms', 'tonnes', 'liters', 'meters', 'boxes', 'units'];

function StarRating({ rating, size = 14, interactive, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type={interactive ? 'button' : undefined}
          onClick={interactive ? () => onChange(s) : undefined}
          onMouseEnter={interactive ? () => setHover(s) : undefined}
          onMouseLeave={interactive ? () => setHover(0) : undefined}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            style={{ width: size, height: size }}
            className={cn(
              'transition-colors',
              s <= (hover || rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'
            )}
          />
        </button>
      ))}
    </div>
  );
}

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
    if (!user) return toast.error('Please login to send an inquiry');
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
    if (!user) return toast.error('Please login to leave a review');
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Product not found</div>;

  const { product, reviews } = data;
  const images = product.images?.length > 0 ? product.images : ['https://placehold.co/600x400/f1f5f9/94a3b8?text=No+Image'];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/products" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" /> Products
          </Link>
          {product.category?.name && (
            <>
              <span>/</span>
              <Link to={`/products?category=${product.category._id}`} className="hover:text-foreground transition-colors">
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-foreground truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Left column */}
          <div>
            {/* Images + Info */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Images */}
              <div>
                <div className="rounded-xl border border-border bg-card overflow-hidden aspect-square mb-3">
                  <motion.img
                    key={activeImg}
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    src={images[activeImg]}
                    alt={product.name}
                    className="w-full h-full object-contain p-4"
                  />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        className={cn(
                          'flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all',
                          i === activeImg ? 'border-primary-500 ring-1 ring-primary-300' : 'border-border hover:border-primary-300'
                        )}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product info */}
              <div className="space-y-4">
                {product.featured && <Badge className="bg-primary-600 text-white">Featured</Badge>}

                <h1 className="text-2xl font-bold text-foreground leading-tight">{product.name}</h1>

                {product.rating?.count > 0 && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={product.rating.average} />
                    <span className="text-sm text-muted-foreground">
                      {product.rating.average?.toFixed(1)} ({product.rating.count} reviews)
                    </span>
                  </div>
                )}

                <div>
                  <p className="text-3xl font-extrabold text-primary-600 dark:text-primary-400">
                    ₹{product.price?.min?.toLocaleString()}
                    {product.price?.max && (
                      <span className="text-2xl"> – ₹{product.price.max.toLocaleString()}</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Per {product.price?.unit}
                    {product.minOrderQty && ` · Min. order: ${product.minOrderQty} ${product.price?.unit}`}
                  </p>
                </div>

                {product.brand && (
                  <p className="text-sm"><span className="text-muted-foreground">Brand:</span> <span className="font-medium text-foreground">{product.brand}</span></p>
                )}

                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>

                {/* Print specs */}
                {product.printSpecs && Object.values(product.printSpecs).some(Boolean) && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Print Specifications</p>
                    <div className="flex flex-wrap gap-2">
                      {product.printSpecs.paperWeight && (
                        <Badge variant="default" className="text-xs">{product.printSpecs.paperWeight} gsm</Badge>
                      )}
                      {product.printSpecs.finish && (
                        <Badge variant="default" className="text-xs capitalize">{product.printSpecs.finish} finish</Badge>
                      )}
                      {product.printSpecs.size && (
                        <Badge variant="default" className="text-xs">{product.printSpecs.size}</Badge>
                      )}
                      {product.printSpecs.sides && (
                        <Badge variant="default" className="text-xs capitalize">{product.printSpecs.sides}-sided</Badge>
                      )}
                      {product.printSpecs.quantity && (
                        <Badge variant="default" className="text-xs">{product.printSpecs.quantity} pcs</Badge>
                      )}
                      {product.printSpecs.deliveryDays && (
                        <Badge variant="info" className="text-xs">{product.printSpecs.deliveryDays}-day delivery</Badge>
                      )}
                      {product.printSpecs.material && (
                        <Badge variant="default" className="text-xs capitalize">{product.printSpecs.material}</Badge>
                      )}
                    </div>
                    <Link
                      to={`/compare?category=${product.category?._id || product.category}`}
                      className="inline-flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline mt-2"
                    >
                      <GitCompare className="h-3.5 w-3.5" /> Compare prices from other sellers
                    </Link>
                  </div>
                )}

                {/* Specifications table */}
                {product.specifications?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Specifications</p>
                    <div className="rounded-lg border border-border overflow-hidden">
                      {product.specifications.map((spec, i) => (
                        <div
                          key={i}
                          className={cn(
                            'flex text-sm px-4 py-2.5',
                            i % 2 === 0 ? 'bg-muted/30' : 'bg-transparent'
                          )}
                        >
                          <span className="text-muted-foreground w-1/2">{spec.key}</span>
                          <span className="font-medium text-foreground w-1/2">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {product.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {product.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">#{tag}</Badge>
                    ))}
                  </div>
                )}

                {/* Trust indicators */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { icon: Shield, label: 'Verified Seller' },
                    { icon: Truck, label: 'Fast Dispatch' },
                    { icon: BadgeCheck, label: 'Quality Check' },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 text-center">
                      <item.icon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-xs font-medium text-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-foreground">
                  Reviews <span className="text-muted-foreground font-normal text-base">({reviews?.length || 0})</span>
                </h2>
                {user && (
                  <Button variant="outline" size="sm" onClick={() => setShowReviewForm(!showReviewForm)}>
                    {showReviewForm ? 'Cancel' : 'Write Review'}
                  </Button>
                )}
              </div>

              <AnimatePresence>
                {showReviewForm && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleReview}
                    className="bg-muted/30 rounded-xl p-4 mb-5 space-y-3 overflow-hidden"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Your Rating</p>
                      <StarRating rating={reviewForm.rating} size={22} interactive onChange={(r) => setReviewForm({ ...reviewForm, rating: r })} />
                    </div>
                    <textarea
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                      placeholder="Share your experience with this product…"
                      rows={3}
                      className="input resize-none"
                    />
                    <Button type="submit" size="sm">Submit Review</Button>
                  </motion.form>
                )}
              </AnimatePresence>

              {!reviews?.length ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Star className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm">No reviews yet. Be the first to review!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r._id} className="flex gap-3 pb-4 border-b border-border last:border-0 last:pb-0">
                      <Avatar name={r.user?.name} size="sm" className="flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium text-sm text-foreground">{r.user?.name}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                        </div>
                        <StarRating rating={r.rating} size={12} />
                        {r.comment && (
                          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{r.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column: Inquiry + Seller */}
          <div className="space-y-4">
            {/* Inquiry Form */}
            <div className="rounded-xl border border-border bg-card p-5 sticky top-20">
              <h2 className="text-base font-bold text-foreground mb-4">Send Inquiry</h2>
              <form onSubmit={handleInquiry} className="space-y-3">
                <textarea
                  value={inquiryForm.message}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                  placeholder="Describe your requirement, quantity, customization needs…"
                  required
                  rows={4}
                  className="input resize-none"
                />

                <div className="flex gap-2">
                  <div className="flex items-center gap-1 border border-input rounded-lg overflow-hidden">
                    <button type="button" onClick={() => setInquiryForm(f => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))}
                      className="h-10 w-10 flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      value={inquiryForm.quantity}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, quantity: Math.max(1, Number(e.target.value)) })}
                      min={1}
                      className="w-14 text-center bg-transparent text-sm font-medium focus:outline-none"
                    />
                    <button type="button" onClick={() => setInquiryForm(f => ({ ...f, quantity: f.quantity + 1 }))}
                      className="h-10 w-10 flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <select
                    value={inquiryForm.unit}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, unit: e.target.value })}
                    className="input flex-1 h-10"
                  >
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>

                {/* Design attachment */}
                {user && (
                  <div className="rounded-lg border border-dashed border-border p-3 bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Image className="h-3.5 w-3.5 text-muted-foreground" /> Attach Design
                      </span>
                      <button type="button" onClick={() => setShowDesignPicker(!showDesignPicker)}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                        {showDesignPicker ? 'Hide' : myDesigns.length > 0 ? `My Designs (${myDesigns.length})` : 'Browse'}
                      </button>
                    </div>

                    {selectedDesign && (
                      <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg px-3 py-2 mb-2">
                        <Image className="h-3.5 w-3.5 text-primary-600 flex-shrink-0" />
                        <span className="text-xs text-primary-700 dark:text-primary-300 truncate flex-1">{selectedDesign.name}</span>
                        <button type="button" onClick={() => setSelectedDesign(null)}
                          className="text-muted-foreground hover:text-red-500 transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    <AnimatePresence>
                      {showDesignPicker && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          {myDesigns.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              No designs saved.{' '}
                              <Link to="/dashboard/designs" className="text-primary-600 dark:text-primary-400 hover:underline">
                                Upload from Design Library
                              </Link>
                            </p>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                              {myDesigns.map((d) => (
                                <button key={d._id} type="button"
                                  onClick={() => { setSelectedDesign(d); setShowDesignPicker(false); }}
                                  className={cn(
                                    'border rounded-lg p-2 text-left hover:border-primary-400 transition-colors text-xs',
                                    selectedDesign?._id === d._id
                                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                      : 'border-border'
                                  )}
                                >
                                  <p className="font-medium text-foreground truncate">{d.name}</p>
                                  {d.category && <p className="text-muted-foreground capitalize">{d.category.replace(/-/g, ' ')}</p>}
                                </button>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <Button type="submit" loading={submitting} className="w-full gap-2">
                  <Send className="h-4 w-4" />
                  {!submitting && 'Send Inquiry'}
                </Button>

                {product.seller?.phone && (
                  <a
                    href={`https://wa.me/91${product.seller.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in ${product.name}. Please send me a quotation.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-10 bg-[#25D366] hover:bg-[#20b858] text-white font-semibold rounded-lg text-sm transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
                  </a>
                )}
              </form>
            </div>

            {/* Seller info */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-bold text-foreground mb-4">Supplier Details</h3>
              <div className="flex items-center gap-3 mb-4">
                <Avatar name={product.seller?.businessName || product.seller?.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {product.seller?.businessName || product.seller?.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <BadgeCheck className="h-3.5 w-3.5 text-primary-500" />
                    <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">Verified Supplier</span>
                  </div>
                </div>
              </div>

              {product.seller?.address?.city && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  {product.seller.address.city}{product.seller.address.state ? `, ${product.seller.address.state}` : ''}
                </div>
              )}

              <Link to={`/suppliers/${product.seller?._id}`}>
                <Button variant="outline" className="w-full" size="sm">
                  View Full Profile <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
