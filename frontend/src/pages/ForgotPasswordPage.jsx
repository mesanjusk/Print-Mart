import { Link } from 'react-router-dom';
import QRCode from 'react-qr-code';

const WA_NUMBER = import.meta.env.VITE_WA_BUSINESS_NUMBER || '919370195000';
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=RESET`;

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">PM</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Forgot Password</h1>
          <p className="text-gray-500 text-sm mt-1">Reset your password via WhatsApp</p>
        </div>

        <div className="card p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg viewBox="0 0 24 24" className="w-9 h-9 fill-green-600">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
            </svg>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Reset via WhatsApp</h2>
            <p className="text-sm text-gray-500">
              Send <strong>RESET</strong> to our WhatsApp number and we'll guide you through resetting your password in the chat.
            </p>
          </div>

          {/* QR — desktop only */}
          <div className="hidden sm:flex justify-center">
            <div className="bg-white p-3 rounded-lg shadow-sm inline-block border border-green-100">
              <QRCode value={WA_LINK} size={140} />
            </div>
          </div>

          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-3 rounded-lg transition-colors w-full"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
            </svg>
            Open WhatsApp to Reset Password
          </a>

          <div className="bg-gray-50 rounded-lg px-4 py-3 text-left space-y-1.5 text-xs text-gray-500">
            <p className="font-medium text-gray-600">How it works:</p>
            <p>1. Scan QR or tap the button above — <strong>or</strong> manually send <strong>RESET</strong> to <strong>+91 93701 95000</strong> on WhatsApp</p>
            <p>2. You'll instantly receive a new temporary password</p>
            <p>3. Login and change your password from profile settings</p>
          </div>

          <Link to="/login" className="block text-sm text-green-600 hover:text-green-700 font-medium">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
