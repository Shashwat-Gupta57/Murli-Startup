const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// ─── GET /api/addresses — all addresses for logged-in user ─────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ─── POST /api/addresses — create a new address ────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { label, custom_label, address_text, lat, lng, is_default } = req.body;
    if (!address_text || !lat || !lng) return res.status(400).json({ error: 'address_text, lat, lng required' });

    await client.query('BEGIN');

    // If this is set as default, unset all others
    if (is_default) {
      await client.query('UPDATE user_addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    }

    // If user has no addresses yet, force this one as default
    const countRes = await client.query('SELECT COUNT(*) FROM user_addresses WHERE user_id = $1', [req.user.id]);
    const forceDefault = parseInt(countRes.rows[0].count) === 0;

    const result = await client.query(
      `INSERT INTO user_addresses (user_id, label, custom_label, address_text, lat, lng, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, label || 'home', custom_label || null, address_text, lat, lng, is_default || forceDefault]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  } finally {
    client.release();
  }
});

// ─── PATCH /api/addresses/:id/default — set as default ─────────────────────
router.patch('/:id/default', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // Verify ownership
    const check = await client.query('SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Address not found' });

    await client.query('BEGIN');
    await client.query('UPDATE user_addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    const result = await client.query('UPDATE user_addresses SET is_default = true WHERE id = $1 RETURNING *', [id]);
    await client.query('COMMIT');

    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  } finally {
    client.release();
  }
});

// ─── DELETE /api/addresses/:id — delete an address ─────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const check = await pool.query('SELECT * FROM user_addresses WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Address not found' });

    const addr = check.rows[0];

    // Cannot delete the only default address
    if (addr.is_default) {
      const countRes = await pool.query('SELECT COUNT(*) FROM user_addresses WHERE user_id = $1', [req.user.id]);
      if (parseInt(countRes.rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Cannot delete your only address' });
      }
    }

    await pool.query('DELETE FROM user_addresses WHERE id = $1', [id]);

    // If we deleted the default, promote the most recent remaining
    if (addr.is_default) {
      await pool.query(
        `UPDATE user_addresses SET is_default = true WHERE id = (
           SELECT id FROM user_addresses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1
         )`,
        [req.user.id]
      );
    }

    res.json({ message: 'Address deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
