const webpush = require('web-push');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@printmart.in';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  // Generate example keys on startup so admin can copy them into .env
  try {
    const keys = webpush.generateVAPIDKeys();
    console.warn('[Push] VAPID keys not set. Add these to your .env:');
    console.warn('VAPID_PUBLIC_KEY=' + keys.publicKey);
    console.warn('VAPID_PRIVATE_KEY=' + keys.privateKey);
  } catch (_) {}
}

/**
 * Send a web push notification to a stored subscription object.
 * Returns: true on success, 'expired' if subscription is stale, null on error.
 */
const sendPush = async (subscription, payload) => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[Push] VAPID keys not configured – skipping push.');
    return null;
  }
  if (!subscription?.endpoint) return null;

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return 'expired';
    }
    console.error('[Push] sendNotification error:', err.message);
    return null;
  }
};

/**
 * Send push to multiple users. Cleans up expired subscriptions via callback.
 * @param {Array} users  Array of User documents with pushSubscription + pushEnabled
 * @param {object} payload  { title, body, url, tag }
 * @param {Function} onExpired  Called with userId when subscription is expired
 */
const sendPushToMany = async (users, payload, onExpired) => {
  let sent = 0;
  await Promise.allSettled(
    users.map(async (u) => {
      if (!u.pushEnabled || !u.pushSubscription?.endpoint) return;
      const result = await sendPush(u.pushSubscription, payload);
      if (result === true) sent++;
      if (result === 'expired' && onExpired) onExpired(u._id);
    })
  );
  console.log(`[Push] Sent ${sent}/${users.length} notifications.`);
  return sent;
};

module.exports = { sendPush, sendPushToMany };
