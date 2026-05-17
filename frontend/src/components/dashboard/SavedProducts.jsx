import { useState, useEffect } from 'react';
import { supplierAPI } from '../../services/api';
import ProductCard from '../products/ProductCard';
import Spinner from '../common/Spinner';

export default function SavedProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supplierAPI.getSaved().then((r) => setProducts(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Saved Products</h1>
      {loading ? <Spinner /> : products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">❤️</p>
          <p>No saved products yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
      )}
    </div>
  );
}
