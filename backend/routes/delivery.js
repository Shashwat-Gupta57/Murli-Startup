const express = require('express');
const router = express.Router();
const pool = require('../db');
const { sendPushToUser, sendPushToDeliveryPartners } = require('../utils/sendPush');

// ─── POST /api/delivery/login — Stateless login via delivery_code ──────────
router.post('/login', async (req, res) => {
  try {
    const { delivery_code } = req.body;
    if (!delivery_code) return res.status(400).json({ error: 'delivery_code required' });

    const result = await pool.query(
      'SELECT id, business_name, delivery_code FROM businesses WHERE delivery_code = $1',
      [delivery_code.toUpperCase()]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invalid delivery code' });

    const biz = result.rows[0];
    res.json({ business_id: biz.id, business_name: biz.business_name, delivery_code: biz.delivery_code });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ─── GET /api/delivery/orders — Orders for delivery partner ────────────────
router.get('/orders', async (req, res) => {
  try {
    const { delivery_code } = req.query;
    if (!delivery_code) return res.status(400).json({ error: 'delivery_code required' });

    const bizRes = await pool.query(
      'SELECT id FROM businesses WHERE delivery_code = $1',
      [delivery_code.toUpperCase()]
    );
    if (bizRes.rows.length === 0) return res.status(404).json({ error: 'Invalid delivery code' });
    const businessId = bizRes.rows[0].id;

    const orders = await pool.query(`
      SELECT o.id, o.status, o.subtotal, o.delivery_fee, o.total, o.delivery_address,
             o.created_at, o.customer_id,
             u.name AS customer_name, u.phone AS customer_phone
      FROM orders o
      JOIN users u ON o.customer_id = u.id
      WHERE o.business_id = $1 AND o.status IN ('accepted', 'out_for_delivery')
      ORDER BY o.created_at DESC
    `, [businessId]);

    // Fetch items for each order
    const orderIds = orders.rows.map(o => o.id);
    let itemsByOrder = {};
    if (orderIds.length > 0) {
      const itemsRes = await pool.query(
        'SELECT * FROM order_items WHERE order_id = ANY($1)',
        [orderIds]
      );
      for (const item of itemsRes.rows) {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push(item);
      }
    }

    const result = orders.rows.map(o => ({
      ...o,
      items: itemsByOrder[o.id] || []
    }));

    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ─── PATCH /api/delivery/orders/:id/out-for-delivery ───────────────────────
router.patch('/orders/:id/out-for-delivery', async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_code } = req.body;
    if (!delivery_code) return res.status(400).json({ error: 'delivery_code required' });

    const bizRes = await pool.query(
      'SELECT id FROM businesses WHERE delivery_code = $1',
      [delivery_code.toUpperCase()]
    );
    if (bizRes.rows.length === 0) return res.status(404).json({ error: 'Invalid delivery code' });
    const businessId = bizRes.rows[0].id;

    const orderRes = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND business_id = $2',
      [id, businessId]
    );
    if (orderRes.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orderRes.rows[0];

    if (order.status !== 'accepted') {
      return res.status(400).json({ error: `Cannot mark as out_for_delivery from status '${order.status}'` });
    }

    const updated = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      ['out_for_delivery', id]
    );

    // Push to customer
    sendPushToUser(order.customer_id, {
      title: 'Out for Delivery!',
      body: 'Your order is out for delivery!',
      icon: '/icons/icon-192.png',
      url: '/market'
    }).catch(() => {});

    // Push to all delivery partners for this business
    sendPushToDeliveryPartners(businessId, {
      title: 'Order Update',
      body: `Order #${id} is now out for delivery.`,
      icon: '/icons/icon-192.png'
    }).catch(() => {});

    // Push to retailer
    const retailerRes = await pool.query(
      'SELECT retailer_id FROM businesses WHERE id = $1',
      [businessId]
    );
    if (retailerRes.rows.length > 0) {
      sendPushToUser(retailerRes.rows[0].retailer_id, {
        title: 'Delivery Started',
        body: `Order #${id} is now out for delivery.`,
        icon: '/icons/icon-192.png',
        url: '/dashboard'
      }).catch(() => {});
    }

    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ─── POST /api/delivery/orders/:id/verify-otp ─────────────────────────────
router.post('/orders/:id/verify-otp', async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_code, otp } = req.body;
    if (!delivery_code || !otp) return res.status(400).json({ error: 'delivery_code and otp required' });

    const bizRes = await pool.query(
      'SELECT id FROM businesses WHERE delivery_code = $1',
      [delivery_code.toUpperCase()]
    );
    if (bizRes.rows.length === 0) return res.status(404).json({ error: 'Invalid delivery code' });
    const businessId = bizRes.rows[0].id;

    const orderRes = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND business_id = $2',
      [id, businessId]
    );
    if (orderRes.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orderRes.rows[0];

    if (order.status !== 'out_for_delivery') {
      return res.status(400).json({ error: 'Order is not out for delivery' });
    }

    if (order.otp_attempts >= 20) {
      return res.status(400).json({ error: 'Too many OTP attempts. Order cancelled.' });
    }

    if (order.otp === otp) {
      // OTP correct — mark delivered
      const updated = await pool.query(
        'UPDATE orders SET status = $1, otp = NULL, otp_attempts = 0 WHERE id = $2 RETURNING *',
        ['delivered', id]
      );

      sendPushToUser(order.customer_id, {
        title: 'Order Delivered!',
        body: 'Your order has been delivered. Enjoy!',
        icon: '/icons/icon-192.png',
        url: '/market'
      }).catch(() => {});

      const retailerRes = await pool.query('SELECT retailer_id FROM businesses WHERE id = $1', [businessId]);
      if (retailerRes.rows.length > 0) {
        sendPushToUser(retailerRes.rows[0].retailer_id, {
          title: 'Order Delivered',
          body: `Order #${id} has been delivered successfully.`,
          icon: '/icons/icon-192.png',
          url: '/dashboard'
        }).catch(() => {});
      }

      return res.json({ success: true, order: updated.rows[0] });
    } else {
      // OTP incorrect
      const newAttempts = (order.otp_attempts || 0) + 1;

      if (newAttempts >= 20) {
        // Cancel order due to fraud
        await pool.query(
          'UPDATE orders SET status = $1, otp = NULL, otp_attempts = $2, cancellation_reason = $3 WHERE id = $4',
          ['cancelled', newAttempts, 'fraudulent_otp_attempts', id]
        );

        sendPushToUser(order.customer_id, {
          title: 'Order Cancelled',
          body: 'Your order has been cancelled due to too many incorrect OTP attempts.',
          icon: '/icons/icon-192.png',
          url: '/market'
        }).catch(() => {});

        const retailerRes = await pool.query('SELECT retailer_id FROM businesses WHERE id = $1', [businessId]);
        if (retailerRes.rows.length > 0) {
          sendPushToUser(retailerRes.rows[0].retailer_id, {
            title: 'Order Cancelled — Fraud Alert',
            body: `Order #${id} cancelled due to 20 incorrect OTP attempts.`,
            icon: '/icons/icon-192.png',
            url: '/dashboard'
          }).catch(() => {});
        }

        return res.json({ success: false, attempts_remaining: 0, cancelled: true });
      }

      await pool.query('UPDATE orders SET otp_attempts = $1 WHERE id = $2', [newAttempts, id]);
      return res.json({ success: false, attempts_remaining: 20 - newAttempts });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ─── POST /api/delivery/subscribe-push ─────────────────────────────────────
router.post('/subscribe-push', async (req, res) => {
  try {
    const { delivery_code, push_subscription } = req.body;
    if (!delivery_code || !push_subscription) return res.status(400).json({ error: 'delivery_code and push_subscription required' });

    const bizRes = await pool.query(
      'SELECT id FROM businesses WHERE delivery_code = $1',
      [delivery_code.toUpperCase()]
    );
    if (bizRes.rows.length === 0) return res.status(404).json({ error: 'Invalid delivery code' });
    const businessId = bizRes.rows[0].id;

    // Upsert by endpoint
    await pool.query(`
      INSERT INTO delivery_sessions (business_id, delivery_code, push_subscription, last_active)
      VALUES ($1, $2, $3, now())
      ON CONFLICT ON CONSTRAINT delivery_sessions_endpoint_unique DO UPDATE
      SET push_subscription = $3, last_active = now()
    `, [businessId, delivery_code.toUpperCase(), push_subscription]).catch(async () => {
      // If unique constraint doesn't exist, try with endpoint matching
      const existing = await pool.query(
        "SELECT id FROM delivery_sessions WHERE business_id = $1 AND push_subscription->>'endpoint' = $2",
        [businessId, push_subscription.endpoint]
      );
      if (existing.rows.length > 0) {
        await pool.query(
          'UPDATE delivery_sessions SET push_subscription = $1, last_active = now() WHERE id = $2',
          [push_subscription, existing.rows[0].id]
        );
      } else {
        await pool.query(
          'INSERT INTO delivery_sessions (business_id, delivery_code, push_subscription) VALUES ($1, $2, $3)',
          [businessId, delivery_code.toUpperCase(), push_subscription]
        );
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
