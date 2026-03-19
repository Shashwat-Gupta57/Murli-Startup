const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const GEOAPIFY_KEY = process.env.GEOAPIFY_KEY;

// Generate unique delivery code: 4 digits + 1 uppercase letter
async function generateDeliveryCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 20; attempt++) {
    const digits = String(Math.floor(1000 + Math.random() * 9000));
    const letter = letters[Math.floor(Math.random() * 26)];
    const code = digits + letter;
    const exists = await pool.query('SELECT 1 FROM businesses WHERE delivery_code = $1', [code]);
    if (exists.rows.length === 0) return code;
  }
  throw new Error('Could not generate unique delivery code');
}

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

    // Extract city from business coordinates
    const city = (business_lat && business_lng) ? await extractCity(business_lat, business_lng) : null;

    // Generate unique delivery code
    const deliveryCode = await generateDeliveryCode();

    const businessResult = await client.query(
      `INSERT INTO businesses
        (retailer_id, business_name, owner_name, home_phone, business_phone,
         home_address, business_address, aadhar_number, tags, latitude, longitude, city, delivery_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [req.user.id, business_name, owner_name, home_phone, business_phone,
       home_address, business_address, aadhar_number, tags || [], business_lat || null, business_lng || null, city, deliveryCode]
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

// POST /api/businesses/backfill-cities — Auto-fill missing city for retailer's businesses
router.post('/backfill-cities', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, latitude, longitude FROM businesses WHERE retailer_id = $1 AND city IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.json({ updated: 0 });

    let updated = 0;
    for (const biz of result.rows) {
      const city = await extractCity(biz.latitude, biz.longitude);
      if (city) {
        await pool.query('UPDATE businesses SET city = $1 WHERE id = $2', [city, biz.id]);
        updated++;
      }
    }
    res.json({ updated });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST /api/businesses/:id/regenerate-delivery-code
router.post('/:id/regenerate-delivery-code', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'retailer') return res.status(403).json({ error: 'Only retailers' });
    const { id } = req.params;
    const check = await pool.query('SELECT id FROM businesses WHERE id = $1 AND retailer_id = $2', [id, req.user.id]);
    if (check.rows.length === 0) return res.status(403).json({ error: 'Not your business' });
    const code = await generateDeliveryCode();
    const result = await pool.query('UPDATE businesses SET delivery_code = $1 WHERE id = $2 RETURNING *', [code, id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
