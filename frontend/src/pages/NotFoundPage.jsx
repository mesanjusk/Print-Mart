import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-[120px] md:text-[160px] font-extrabold leading-none bg-gradient-to-br from-primary-200 to-primary-400 dark:from-primary-800 dark:to-primary-600 bg-clip-text text-transparent select-none">
          404
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-2 mb-3">
          Page not found
        </h1>
        <p className="text-muted-foreground text-base max-w-md mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button size="lg">
              <Home className="h-4 w-4" /> Back to Home
            </Button>
          </Link>
          <Link to="/products">
            <Button variant="outline" size="lg">
              <Search className="h-4 w-4" /> Browse Products
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
