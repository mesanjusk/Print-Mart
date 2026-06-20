import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import WhatsAppRegisterQR from '../components/common/WhatsAppRegisterQR';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: searchParams.get('role') || 'buyer',
    businessName: '',
  });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (!form.phone) return toast.error('Phone number is required to receive OTP');
    setLoading(true);
    try {
      await authAPI.sendOTP({ phone: form.phone, purpose: 'registration' });
      toast.success('OTP sent to your WhatsApp!');
      setStep('otp');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the 6-digit OTP');
    setLoading(true);
    try {
      await register({ ...form, otp });
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await authAPI.sendOTP({ phone: form.phone, purpose: 'registration' });
      toast.success('New OTP sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">PM</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join India's largest printing marketplace</p>
        </div>

        <div className="card p-8">
          {step === 'form' ? (
            <>
              <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
                {['buyer', 'seller'].map((r) => (
                  <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                    className={`flex-1 py-2 rounded-md text-sm font-medium capitalize transition-colors ${form.role === r ? 'bg-green-600 text-white shadow' : 'text-gray-600 hover:text-gray-800'}`}>
                    I'm a {r}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendOTP} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input" placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp Number <span className="text-red-500">*</span>
                  </label>
                  <input type="tel" required value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input" placeholder="9876543210" />
                  <p className="text-xs text-gray-400 mt-1">OTP will be sent to this WhatsApp number</p>
                </div>
                {form.role === 'seller' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                    <input type="text" value={form.businessName}
                      onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                      className="input" placeholder="Your company name" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" required value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input" placeholder="Min. 6 characters" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base mt-2">
                  {loading ? 'Sending OTP...' : 'Send OTP on WhatsApp →'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-4">
                Already have an account?{' '}
                <Link to="/login" className="text-green-600 hover:text-green-700 font-medium">Login</Link>
              </p>
            </>
          ) : (
            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 fill-green-600">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-600">
                  OTP sent to <strong>{form.phone}</strong> on WhatsApp
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-center">Enter 6-digit OTP</label>
                <input
                  type="number"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  className="input text-center text-2xl tracking-widest font-bold"
                  placeholder="••••••"
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </button>

              <div className="flex justify-between text-sm">
                <button type="button" onClick={() => setStep('form')}
                  className="text-gray-500 hover:text-gray-700">
                  ← Change details
                </button>
                <button type="button" disabled={loading} onClick={handleResend}
                  className="text-green-600 hover:text-green-700 font-medium">
                  Resend OTP
                </button>
              </div>
            </form>
          )}
        </div>
        <div className="mt-5">
          <WhatsAppRegisterQR />
        </div>
      </div>
    </div>
  );
}
