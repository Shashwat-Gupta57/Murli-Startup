const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const GEOAPIFY_KEY = process.env.GEOAPIFY_KEY;

async function extractCity(lat, lng) {
  try {
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${GEOAPIFY_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const p = data.features[0].properties;
      return p.city || p.county || p.state || null;
    }
    return null;
  } catch (err) {
    console.error('City extraction error:', err.message);
    return null;
  }
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, address, role, lat, lng } = req.body;

    if (!['customer', 'retailer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (!lat || !lng) {
      return res.status(400).json({ error: 'invalid_address' });
    }

    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Extract city from coordinates
    const city = (lat && lng) ? await extractCity(lat, lng) : null;

    const newUser = await pool.query(
      'INSERT INTO users (name, email, password_hash, phone, address, role, lat, lng, city) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, name, email, role, city',
      [name, email, password_hash, phone, address, role, lat || null, lng || null, city]
    );

    const payload = {
      user: {
        id: newUser.rows[0].id,
        role: newUser.rows[0].role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: newUser.rows[0] });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userQuery.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid Credentials' });
    }

    const user = userQuery.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid Credentials' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, city: user.city } });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get User (optional useful route)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userQuery = await pool.query('SELECT id, name, email, role, phone, address, lat, lng, city FROM users WHERE id = $1', [req.user.id]);
    res.json(userQuery.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
