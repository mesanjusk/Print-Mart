import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function CallRedirectPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const phone = searchParams.get('phone')?.replace(/\D/g, '');
    if (phone) {
      window.location.href = `tel:+${phone}`;
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl mb-2">📞</p>
        <p className="text-gray-600">Opening phone dialer...</p>
      </div>
    </div>
  );
}
