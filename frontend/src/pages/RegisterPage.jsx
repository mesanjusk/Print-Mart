import { Link } from 'react-router-dom';
import WhatsAppRegisterQR from '../components/common/WhatsAppRegisterQR';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">PM</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Join PrintMart</h1>
          <p className="text-gray-500 text-sm mt-1">Register instantly via WhatsApp</p>
        </div>

        <WhatsAppRegisterQR />

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-green-600 hover:text-green-700 font-medium">Login</Link>
        </p>
      </div>
    </div>
  );
}
