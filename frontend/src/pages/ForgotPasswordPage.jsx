import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Scan, ArrowLeft, CheckCircle2 } from 'lucide-react';
import QRCode from 'react-qr-code';

const WA_NUMBER = import.meta.env.VITE_WA_BUSINESS_NUMBER || '919370195000';
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=RESET`;

const STEPS = [
  { step: '1', text: 'Scan QR or tap the button below — or send RESET to +91 93701 95000' },
  { step: '2', text: "You'll instantly receive a new temporary password on WhatsApp" },
  { step: '3', text: 'Login and change your password from Profile Settings' },
];

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-md w-full"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 mb-4 shadow-glow">
            <span className="text-white font-extrabold text-xl tracking-tight">PM</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Forgot Password?</h1>
          <p className="text-muted-foreground text-sm mt-1">Reset instantly via WhatsApp</p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-card p-8 space-y-6">
          {/* WhatsApp icon */}
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground mb-1">Reset via WhatsApp</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Send <strong className="text-foreground">RESET</strong> to our WhatsApp and we'll send you a temporary password instantly.
            </p>
          </div>

          {/* QR Code — desktop only */}
          <div className="hidden sm:flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Scan className="h-3.5 w-3.5" /> Scan with your phone
            </div>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-border inline-block">
              <QRCode value={WA_LINK} size={140} />
            </div>
          </div>

          {/* WhatsApp CTA */}
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-3 rounded-xl transition-colors shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white flex-shrink-0">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
            </svg>
            Open WhatsApp to Reset
          </a>

          {/* How it works */}
          <div className="rounded-xl bg-muted/50 border border-border/50 px-4 py-4 space-y-2.5">
            <p className="text-xs font-semibold text-foreground">How it works</p>
            {STEPS.map(({ step, text }) => (
              <div key={step} className="flex items-start gap-2.5">
                <div className="h-5 w-5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                  {step}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>

          <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
