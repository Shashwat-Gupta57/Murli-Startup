const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// POST /api/products — Create product (with optional images)
router.post('/', authMiddleware, upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 }
]), async (req, res) => {
  try {
    if (req.user.role !== 'retailer') {
      return res.status(403).json({ error: 'Only retailers can add products' });
    }

    const { business_id, name, description, price, unit, stock_qty } = req.body;

    // Verify business belongs to this retailer
    const bizCheck = await pool.query(
      'SELECT id FROM businesses WHERE id = $1 AND retailer_id = $2',
      [business_id, req.user.id]
    );
    if (bizCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Business not found or not owned by you' });
    }

    const image1_url = req.files?.image1?.[0] ? `/uploads/products/${req.files.image1[0].filename}` : null;
    const image2_url = req.files?.image2?.[0] ? `/uploads/products/${req.files.image2[0].filename}` : null;

    const result = await pool.query(
      `INSERT INTO products (business_id, name, description, price, unit, stock_qty, image1_url, image2_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [business_id, name, description, price, unit, stock_qty || 0, image1_url, image2_url]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// PUT /api/products/:id — Update product
router.put('/:id', authMiddleware, upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 }
]), async (req, res) => {
  try {
    if (req.user.role !== 'retailer') {
      return res.status(403).json({ error: 'Only retailers can edit products' });
    }

    const { id } = req.params;
    const { name, description, price, unit, stock_qty, is_available } = req.body;

    // Verify ownership
    const prodCheck = await pool.query(
      `SELECT p.* FROM products p
       JOIN businesses b ON p.business_id = b.id
       WHERE p.id = $1 AND b.retailer_id = $2`,
      [id, req.user.id]
    );
    if (prodCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Product not found or not owned by you' });
    }

    const existing = prodCheck.rows[0];
    const image1_url = req.files?.image1?.[0]
      ? `/uploads/products/${req.files.image1[0].filename}`
      : existing.image1_url;
    const image2_url = req.files?.image2?.[0]
      ? `/uploads/products/${req.files.image2[0].filename}`
      : existing.image2_url;

    const result = await pool.query(
      `UPDATE products SET name=$1, description=$2, price=$3, unit=$4,
       stock_qty=$5, is_available=$6, image1_url=$7, image2_url=$8
       WHERE id=$9 RETURNING *`,
      [
        name || existing.name,
        description !== undefined ? description : existing.description,
        price || existing.price,
        unit || existing.unit,
        stock_qty !== undefined ? stock_qty : existing.stock_qty,
        is_available !== undefined ? is_available : existing.is_available,
        image1_url,
        image2_url,
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'retailer') {
      return res.status(403).json({ error: 'Only retailers can delete products' });
    }

    const { id } = req.params;

    const check = await pool.query(
      `SELECT p.id FROM products p
       JOIN businesses b ON p.business_id = b.id
       WHERE p.id = $1 AND b.retailer_id = $2`,
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Product not found or not owned by you' });
    }

    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET /api/products/my — Get all products for the retailer's businesses
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, b.business_name FROM products p
       JOIN businesses b ON p.business_id = b.id
       WHERE b.retailer_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET /api/products/store — Public: Get all available products
router.get('/store', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, b.business_name, b.business_address, b.latitude AS business_lat, b.longitude AS business_lng, b.city AS business_city
       FROM products p
       JOIN businesses b ON p.business_id = b.id
       WHERE p.is_available = true AND b.is_active = true
       ORDER BY p.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET /api/products/:id — Public: Get a single product with business details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, b.business_name, b.business_address, b.business_phone, b.tags,
              b.latitude AS business_lat, b.longitude AS business_lng
       FROM products p
       JOIN businesses b ON p.business_id = b.id
       WHERE p.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
