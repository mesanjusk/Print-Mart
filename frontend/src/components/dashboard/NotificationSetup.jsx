import { useState, useEffect } from 'react';
import { FiBell, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { pushAPI } from '../../services/api';
import toast from 'react-hot-toast';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

export default function NotificationSetup() {
  // status: 'checking' | 'unsupported' | 'denied' | 'prompt' | 'subscribed'
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
      toast.success('Notifications enabled! You\'ll get instant lead alerts.');
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

  if (status === 'unsupported' || status === 'checking') return null;

  if (status === 'subscribed') {
    return (
      <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 mb-4 text-sm">
        <FiCheckCircle size={15} className="text-green-600 flex-shrink-0" />
        <span className="text-green-800 flex-grow">Push notifications active — instant lead alerts on your phone</span>
        <button onClick={disable} disabled={loading} className="text-xs text-gray-400 hover:text-red-500 ml-2">
          Disable
        </button>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-4 text-sm">
        <FiAlertCircle size={15} className="text-red-500 flex-shrink-0" />
        <span className="text-red-700">Notifications blocked. Go to browser settings → Site permissions → Allow notifications for this site.</span>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <FiBell className="text-blue-600" size={20} />
        </div>
        <div className="flex-grow">
          <p className="font-semibold text-gray-800">Enable Push Notifications</p>
          <p className="text-xs text-gray-500 mt-0.5 mb-3">
            Get instant alerts when buyers need your products — even when the app is closed.
            No WhatsApp. Works like any app notification on your phone.
          </p>
          <button
            onClick={enable}
            disabled={loading}
            className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1.5"
          >
            <FiBell size={14} />
            {loading ? 'Enabling...' : 'Enable Notifications'}
          </button>
        </div>
      </div>
    </div>
  );
}
