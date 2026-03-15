const express = require('express');
const router = express.Router();

const GEOAPIFY_KEY = process.env.GEOAPIFY_KEY;

// GET /api/geocode/autocomplete?text=...
router.get('/autocomplete', async (req, res) => {
  try {
    const { text } = req.query;
    if (!text || text.length < 3) return res.json([]);
    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&countrycodes=in&limit=5&apiKey=${GEOAPIFY_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    const results = (data.features || []).map(f => ({
      label: f.properties.formatted,
      lat: f.properties.lat,
      lng: f.properties.lon
    }));
    res.json(results);
  } catch (err) {
    console.error('Geocode autocomplete error:', err.message);
    res.status(500).json({ error: 'Geocode failed' });
  }
});

// GET /api/geocode/reverse?lat=...&lng=...
router.get('/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${GEOAPIFY_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.features || data.features.length === 0) {
      return res.json({ address: '', lat: parseFloat(lat), lng: parseFloat(lng) });
    }
    const f = data.features[0];
    res.json({
      address: f.properties.formatted,
      lat: f.properties.lat,
      lng: f.properties.lon
    });
  } catch (err) {
    console.error('Reverse geocode error:', err.message);
    res.status(500).json({ error: 'Reverse geocode failed' });
  }
});

module.exports = router;
