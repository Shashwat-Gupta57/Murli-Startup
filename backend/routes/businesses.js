const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// Geocode address using OpenStreetMap Nominatim
async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'MurliStartupApp/1.0' }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return { lat: null, lng: null };
  } catch (err) {
    console.error('Geocoding error:', err.message);
    return { lat: null, lng: null };
  }
}

// POST /api/businesses — Create a new business
router.post('/', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    // Only retailers can create businesses
    if (req.user.role !== 'retailer') {
      return res.status(403).json({ error: 'Only retailers can create businesses' });
    }

    const {
      business_name, owner_name, home_phone, business_phone,
      home_address, business_address, aadhar_number, tags,
      delivery_tiers, business_lat, business_lng
    } = req.body;

    await client.query('BEGIN');

    const businessResult = await client.query(
      `INSERT INTO businesses
        (retailer_id, business_name, owner_name, home_phone, business_phone,
         home_address, business_address, aadhar_number, tags, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [req.user.id, business_name, owner_name, home_phone, business_phone,
       home_address, business_address, aadhar_number, tags || [], business_lat || null, business_lng || null]
    );

    const business = businessResult.rows[0];

    // Insert delivery tiers
    if (delivery_tiers && delivery_tiers.length > 0) {
      for (const tier of delivery_tiers) {
        await client.query(
          `INSERT INTO delivery_tiers (business_id, max_distance_meters, fee_rupees)
           VALUES ($1, $2, $3)`,
          [business.id, tier.max_distance_meters, tier.fee_rupees]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch tiers for the response
    const tiersResult = await client.query(
      'SELECT * FROM delivery_tiers WHERE business_id = $1 ORDER BY max_distance_meters',
      [business.id]
    );

    res.json({ business, delivery_tiers: tiersResult.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  } finally {
    client.release();
  }
});

// GET /api/businesses/my — Get businesses for the logged-in retailer
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM businesses WHERE retailer_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
