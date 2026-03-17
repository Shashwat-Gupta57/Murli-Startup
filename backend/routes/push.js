const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/push/vapid-public-key — public, no auth
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe — authenticated
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: 'subscription required' });

    await pool.query(
      `INSERT INTO push_subscriptions (user_id, subscription)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET subscription = $2, created_at = now()`,
      [req.user.id, JSON.stringify(subscription)]
    );
    res.json({ message: 'Subscribed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// DELETE /api/push/unsubscribe — authenticated
router.delete('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
