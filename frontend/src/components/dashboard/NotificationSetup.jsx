import { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { pushAPI } from '../../services/api';
import { Button } from '../ui/button';
import toast from 'react-hot-toast';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

export default function NotificationSetup() {
  const [status, setStatus] = useState('checking');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    navigator.serviceWorker.ready
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setStatus(sub ? 'subscribed' : 'prompt');
      })
      .catch(() => setStatus('prompt'));
  }, []);

  const enable = async () => {
    if (!VAPID_PUBLIC_KEY) {
      toast.error('VITE_VAPID_PUBLIC_KEY not configured — ask admin.');
      return;
    }
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        toast.error('Permission denied. Enable notifications in browser settings.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await pushAPI.subscribe(sub.toJSON());
      setStatus('subscribed');
      toast.success("Notifications enabled! You'll get instant lead alerts.");
    } catch (err) {
      toast.error('Could not enable notifications: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await pushAPI.unsubscribe();
      setStatus('prompt');
      toast.success('Notifications disabled');
    } catch {
      toast.error('Failed to disable');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'unsupported' || status === 'checking' || !VAPID_PUBLIC_KEY) return null;

  if (status === 'subscribed') {
    return (
      <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl px-4 py-2.5 mb-4">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <span className="text-sm text-emerald-800 dark:text-emerald-300 flex-1">Push notifications active — instant lead alerts on your device</span>
        <button onClick={disable} disabled={loading} className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-2">
          Disable
        </button>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="flex items-center gap-2.5 bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-2.5 mb-4">
        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
        <span className="text-sm text-destructive/90">
          Notifications blocked. Go to browser Settings → Site permissions → Allow notifications for this site.
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary-200 dark:border-primary-800/40 bg-primary-50/50 dark:bg-primary-950/20 p-4 mb-5">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
          <Bell className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground text-sm">Enable Push Notifications</p>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">
            Get instant alerts when buyers need your products — even when the app is closed.
          </p>
          <Button size="sm" loading={loading} onClick={enable} className="gap-1.5">
            {!loading && <><Bell className="h-3.5 w-3.5" /> Enable Notifications</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
