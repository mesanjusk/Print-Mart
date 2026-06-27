import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { supplierAPI } from '../../services/api';
import ProductCard from '../products/ProductCard';
import Spinner from '../common/Spinner';

export default function SavedProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supplierAPI.getSaved().then((r) => setProducts(Array.isArray(r.data) ? r.data : [])).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Saved Products</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{products.length} saved product{products.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner size="lg" /></div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Heart className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No saved products</h3>
          <p className="text-muted-foreground text-sm">Tap the heart on any product to save it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
      )}
    </div>
  );
}
