const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// POST /api/reviews — Create a review (customer only, must have a delivered order with this product)
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ error: 'Only customers can write reviews' });
    }

    const { product_id, rating, review_text } = req.body;

    if (!product_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'product_id and rating (1-5) are required' });
    }

    // Check that the customer has a delivered order containing this product
    const orderCheck = await pool.query(
      `SELECT oi.id FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.customer_id = $1 AND oi.product_id = $2 AND o.status = 'delivered'
       LIMIT 1`,
      [req.user.id, product_id]
    );
    if (orderCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You can only review products from delivered orders' });
    }

    // Check for existing review
    const existing = await pool.query(
      'SELECT id FROM reviews WHERE product_id = $1 AND customer_id = $2',
      [product_id, req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'You have already reviewed this product' });
    }

    const result = await pool.query(
      `INSERT INTO reviews (product_id, customer_id, rating, review_text)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [product_id, req.user.id, rating, review_text || null]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET /api/reviews/:productId — Public: Get all reviews for a product
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await pool.query(
      `SELECT r.id, r.rating, r.review_text, r.created_at,
              u.name AS customer_name
       FROM reviews r
       LEFT JOIN users u ON r.customer_id = u.id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [productId]
    );

    // Calculate average and count
    const total_count = result.rows.length;
    const average_rating = total_count > 0
      ? (result.rows.reduce((sum, r) => sum + r.rating, 0) / total_count).toFixed(1)
      : null;

    res.json({
      reviews: result.rows,
      average_rating: average_rating ? parseFloat(average_rating) : null,
      total_count
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
