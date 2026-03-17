const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { subscription } = req.body;
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, subscription)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET subscription = EXCLUDED.subscription, created_at = now()`,
      [req.user.id, subscription]
    );
    res.status(201).json({ message: 'Subscribed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
