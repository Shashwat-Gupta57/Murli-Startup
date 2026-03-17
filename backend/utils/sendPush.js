const webpush = require('web-push');
const pool = require('../db');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:admin@murli.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendPushToUser(userId, payload) {
  try {
    const result = await pool.query(
      'SELECT subscription FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );
    if (result.rows.length === 0) return;
    const subscription = result.rows[0].subscription;
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    if (err.statusCode === 410) {
      await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1', [userId]);
    }
    console.error('Push error:', err.message);
  }
}

module.exports = { sendPushToUser };
