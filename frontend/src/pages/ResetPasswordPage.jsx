import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, KeyRound, ArrowLeft, ShieldCheck } from 'lucide-react';
import { authAPI } from '../services/api';
import { Button } from '../components/ui/button';
import toast from 'react-hot-toast';

function AuthCard({ children }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 mb-4 shadow-glow">
            <span className="text-white font-extrabold text-xl tracking-tight">PM</span>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-card p-8">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const isOTPMode = searchParams.get('method') === 'otp' || !token;

  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [userId, setUserId] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOTPVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the 6-digit OTP');
    setVerifying(true);
    try {
      const { data } = await authAPI.verifyOTP(otp, 'reset_password');
      setUserId(data.userId);
      setOtpVerified(true);
      toast.success('OTP verified. Set your new password.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setVerifying(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      if (isOTPMode) {
        await authAPI.resetPasswordWithOTP(userId, otp, password);
      } else {
        await authAPI.resetPassword(token, password);
      }
      toast.success('Password reset! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. The link or OTP may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (isOTPMode && !otpVerified) {
    return (
      <AuthCard>
        <div className="text-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-3">
            <KeyRound className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Enter OTP</h1>
          <p className="text-muted-foreground text-sm mt-1">Enter the 6-digit code sent to your WhatsApp</p>
        </div>

        <form onSubmit={handleOTPVerify} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="• • • • • •"
            className="input text-center text-2xl tracking-[0.5em] font-bold"
            required
          />
          <Button type="submit" loading={verifying} className="w-full" size="lg">
            {!verifying && 'Verify OTP'}
          </Button>
          <div className="text-center space-y-1.5 pt-1">
            <Link to="/forgot-password" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Resend OTP via WhatsApp
            </Link>
            <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
            </Link>
          </div>
        </form>
      </AuthCard>
    );
  }

  if (!token && !otpVerified) {
    return (
      <AuthCard>
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">No Reset Token</h2>
            <p className="text-sm text-muted-foreground mt-1">The reset link is missing or invalid.</p>
          </div>
          <Link to="/forgot-password">
            <Button className="w-full">Request a New Link</Button>
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="text-center mb-6">
        <div className="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Set New Password</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isOTPMode ? 'OTP verified — choose a strong password' : 'Enter your new password below'}
        </p>
      </div>

      <form onSubmit={handleReset} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type={showPw ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-9 pr-10"
              placeholder="Min. 6 characters"
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input pl-9 pr-10"
              placeholder="Repeat password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" loading={loading} className="w-full" size="lg">
          {!loading && 'Reset Password'}
        </Button>

        <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
        </Link>
      </form>
    </AuthCard>
  );
}
