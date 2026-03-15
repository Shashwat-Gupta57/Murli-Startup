const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// ─── Haversine ─────────────────────────────────────────────────────────────
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ─── POST /api/orders/delivery-fee ─────────────────────────────────────────
router.post('/delivery-fee', authMiddleware, async (req, res) => {
  try {
    const { business_id, delivery_lat, delivery_lng } = req.body;
    const bizRes = await pool.query('SELECT latitude, longitude FROM businesses WHERE id = $1', [business_id]);
    if (bizRes.rows.length === 0) return res.status(404).json({ error: 'Business not found' });
    const biz = bizRes.rows[0];
    if (!biz.latitude || !biz.longitude) return res.status(400).json({ error: 'Business location not available' });
    const distanceMeters = haversineMeters(biz.latitude, biz.longitude, delivery_lat, delivery_lng);
    const tiersRes = await pool.query(
      `SELECT * FROM delivery_tiers WHERE business_id = $1 AND max_distance_meters >= $2 ORDER BY fee_rupees ASC LIMIT 1`,
      [business_id, Math.round(distanceMeters)]
    );
    if (tiersRes.rows.length === 0) return res.json({ distance_meters: Math.round(distanceMeters), delivery_fee: null, outside_range: true, message: 'Outside delivery range' });
    res.json({ distance_meters: Math.round(distanceMeters), delivery_fee: tiersRes.rows[0].fee_rupees, tier: tiersRes.rows[0], outside_range: false });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ─── POST /api/orders — Create order ───────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { items, business_id, delivery_address, delivery_lat, delivery_lng, delivery_fee } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });
    await client.query('BEGIN');

    // ── Stock validation loop ──
    for (const item of items) {
      const stockCheck = await client.query('SELECT name, stock_qty FROM products WHERE id = $1', [item.product_id]);
      if (stockCheck.rows.length === 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: `Product ${item.product_id} not available` }); }
      const sp = stockCheck.rows[0];
      if (item.quantity > sp.stock_qty) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'insufficient_stock', product_name: sp.name, available: sp.stock_qty });
      }
    }

    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const prodRes = await client.query(
        'SELECT id, name, price, unit FROM products WHERE id = $1 AND business_id = $2 AND is_available = true',
        [item.product_id, business_id]
      );
      if (prodRes.rows.length === 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: `Product ${item.product_id} not available` }); }
      const p = prodRes.rows[0];
      const lineTotal = parseFloat(p.price) * item.quantity;
      subtotal += lineTotal;
      orderItems.push({ product_id: p.id, product_name: p.name, unit: p.unit, quantity: item.quantity, unit_price: p.price, line_total: lineTotal.toFixed(2) });
    }

    const total = (subtotal + (delivery_fee || 0)).toFixed(2);
    const orderRes = await client.query(
      `INSERT INTO orders (customer_id, business_id, delivery_address, delivery_lat, delivery_lng, subtotal, delivery_fee, total, payment_method, items_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Cash on Delivery',$9) RETURNING *`,
      [req.user.id, business_id, delivery_address, delivery_lat, delivery_lng, subtotal.toFixed(2), (delivery_fee||0).toFixed(2), total, JSON.stringify(orderItems)]
    );
    const order = orderRes.rows[0];

    for (const oi of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, line_total) VALUES ($1,$2,$3,$4,$5,$6)`,
        [order.id, oi.product_id, oi.product_name, oi.quantity, oi.unit_price, oi.line_total]
      );
    }
    for (const item of items) {
      await client.query('UPDATE products SET stock_qty = stock_qty - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }
    await client.query('COMMIT');
    res.json({ order, items: orderItems });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  } finally {
    client.release();
  }
});

// ─── GET /api/orders?business_id=X — Retailer: get orders for their business ──
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { business_id } = req.query;
    if (!business_id) return res.status(400).json({ error: 'business_id required' });

    // Validate ownership
    if (req.user.role === 'retailer') {
      const check = await pool.query('SELECT id FROM businesses WHERE id = $1 AND retailer_id = $2', [business_id, req.user.id]);
      if (check.rows.length === 0) return res.status(403).json({ error: 'Not your business' });
    }

    const result = await pool.query(
      `SELECT o.*,
              u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
              json_agg(json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'product_name', oi.product_name,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'line_total', oi.line_total
              ) ORDER BY oi.id) AS items
       FROM orders o
       JOIN users u ON o.customer_id = u.id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.business_id = $1
       GROUP BY o.id, u.name, u.email, u.phone
       ORDER BY o.created_at DESC`,
      [business_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ─── GET /api/orders/my — Customer: their own orders ──────────────────────
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*,
              b.business_name,
              json_agg(json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'product_name', oi.product_name,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'line_total', oi.line_total
              ) ORDER BY oi.id) AS items
       FROM orders o
       JOIN businesses b ON o.business_id = b.id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.customer_id = $1
       GROUP BY o.id, b.business_name
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ─── PATCH /api/orders/:id/status — Retailer: update order status ──────────
const VALID_TRANSITIONS = {
  pending: ['accepted', 'cancelled'],
  accepted: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: []
};

router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'retailer') return res.status(403).json({ error: 'Only retailers can update status' });
    const { id } = req.params;
    const { status } = req.body;

    // Verify ownership
    const orderRes = await pool.query(
      `SELECT o.*, b.retailer_id FROM orders o JOIN businesses b ON o.business_id = b.id WHERE o.id = $1`,
      [id]
    );
    if (orderRes.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orderRes.rows[0];
    if (order.retailer_id !== req.user.id) return res.status(403).json({ error: 'Not your order' });

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Cannot transition from '${order.status}' to '${status}'` });
    }

    const updated = await pool.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
