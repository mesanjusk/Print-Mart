import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Star, MapPin, Package, BadgeCheck } from 'lucide-react';
import { supplierAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

export default function ProductCard({ product }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return toast.error('Please login to save products');
    if (saving) return;
    setSaving(true);
    try {
      const { data } = await supplierAPI.saveProduct(product._id);
      setSaved(!saved);
      toast.success(data.message);
    } catch {
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const priceText = product.price?.min
    ? `₹${product.price.min.toLocaleString()}${product.price.max ? ` – ₹${product.price.max.toLocaleString()}` : ''}`
    : null;

  return (
    <Link to={`/products/${product.slug}`} className="block group">
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="rounded-xl border border-border bg-card overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-200 h-full flex flex-col"
      >
        {/* Image */}
        <div className="relative overflow-hidden bg-muted aspect-[4/3] flex-shrink-0">
          <img
            src={product.images?.[0] || 'https://placehold.co/300x200/f1f5f9/94a3b8?text=No+Image'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.featured && (
              <Badge className="bg-primary-600 text-white text-2xs shadow-sm">Featured</Badge>
            )}
            {!product.inStock && (
              <Badge variant="destructive" className="text-2xs shadow-sm">Out of Stock</Badge>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            className={cn(
              'absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-sm flex items-center justify-center transition-all duration-200 hover:scale-110',
              saved ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
            )}
            aria-label="Save product"
          >
            <Heart className={cn('h-3.5 w-3.5 transition-all', saved && 'fill-red-500')} />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col flex-1 gap-1.5">
          <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {product.name}
          </h3>

          {priceText && (
            <div className="flex items-baseline gap-1">
              <p className="text-sm font-bold text-primary-600 dark:text-primary-400">{priceText}</p>
              {product.price?.unit && (
                <span className="text-xs text-muted-foreground">/ {product.price.unit}</span>
              )}
            </div>
          )}

          {product.minOrderQty && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Package className="h-3 w-3" />
              MOQ: {product.minOrderQty}
            </p>
          )}

          <div className="mt-auto pt-1.5 border-t border-border/50 flex items-center justify-between gap-2">
            {product.seller?.businessName ? (
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                {product.seller.plan === 'premium' && (
                  <BadgeCheck className="h-3 w-3 text-primary-500 flex-shrink-0" />
                )}
                {product.seller.businessName}
              </p>
            ) : (
              <span />
            )}

            {product.rating?.count > 0 && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span className="text-xs text-muted-foreground font-medium">
                  {product.rating.average?.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
