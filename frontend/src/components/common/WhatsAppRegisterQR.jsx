import QRCode from 'react-qr-code';

const WA_NUMBER = import.meta.env.VITE_WA_BUSINESS_NUMBER || '919370195000';
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=REGISTER`;

const WaIcon = ({ className = 'w-4 h-4 fill-current' }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
  </svg>
);

export default function WhatsAppRegisterQR({ compact = false }) {
  if (compact) {
    return (
      <a
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 justify-center text-sm text-green-700 hover:text-green-800 font-medium"
      >
        <WaIcon className="w-4 h-4 fill-green-600" />
        Register via WhatsApp
      </a>
    );
  }

  return (
    <div className="border border-green-200 bg-green-50 rounded-xl p-6 text-center">
      <p className="text-sm font-semibold text-green-800 mb-1">📱 Register via WhatsApp</p>
      <p className="text-xs text-gray-500 mb-4">
        Scan the QR code (desktop) or tap the button (mobile)
      </p>

      {/* QR — shown on desktop, hidden on mobile */}
      <div className="hidden sm:flex justify-center mb-4">
        <div className="bg-white p-3 rounded-lg shadow-sm inline-block border border-green-100">
          <QRCode value={WA_LINK} size={150} />
        </div>
      </div>

      <a
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
      >
        <WaIcon className="w-4 h-4 fill-white" />
        Open WhatsApp to Register
      </a>

      <div className="mt-4 bg-white rounded-lg px-4 py-3 text-left space-y-1 border border-green-100">
        <p className="text-xs font-medium text-gray-700">How it works:</p>
        <p className="text-xs text-gray-500">1. Scan QR or tap the button above</p>
        <p className="text-xs text-gray-500">2. Send <strong>REGISTER</strong> to <strong>+91 93701 95000</strong></p>
        <p className="text-xs text-gray-500">3. Choose Buyer or Seller → enter name → enter email</p>
        <p className="text-xs text-gray-500">4. Get your login link + temp password instantly</p>
      </div>
    </div>
  );
}
