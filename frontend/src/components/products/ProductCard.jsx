import { Link } from 'react-router-dom';
import { FiHeart, FiStar, FiMapPin } from 'react-icons/fi';
import { supplierAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function ProductCard({ product }) {
  const { user } = useAuth();

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Please login to save products');
    try {
      const { data } = await supplierAPI.saveProduct(product._id);
      toast.success(data.message);
    } catch {
      toast.error('Failed to save product');
    }
  };

  return (
    <Link to={`/products/${product.slug}`} className="card block group">
      <div className="relative overflow-hidden h-44 bg-gray-100">
        <img
          src={product.images?.[0] || 'https://placehold.co/300x200?text=No+Image'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.featured && (
          <span className="absolute top-2 left-2 badge bg-green-600 text-white">Featured</span>
        )}
        <button
          onClick={handleSave}
          className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow hover:text-red-500 transition-colors"
        >
          <FiHeart size={14} />
        </button>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-gray-800 text-sm line-clamp-2 mb-1">{product.name}</h3>
        <p className="text-green-600 font-bold text-sm mb-1">
          ₹{product.price?.min?.toLocaleString()}
          {product.price?.max && ` – ₹${product.price.max.toLocaleString()}`}
          <span className="text-gray-400 font-normal text-xs"> / {product.price?.unit}</span>
        </p>
        {product.seller?.businessName && (
          <p className="text-gray-500 text-xs truncate">{product.seller.businessName}</p>
        )}
        {product.rating?.count > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <FiStar size={11} className="text-yellow-400 fill-yellow-400" />
            <span className="text-xs text-gray-600">{product.rating.average.toFixed(1)} ({product.rating.count})</span>
          </div>
        )}
      </div>
    </Link>
  );
}
