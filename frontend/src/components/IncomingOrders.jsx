import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';
const STATUS = {
  pending: { label: 'Pending', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  accepted: { label: 'Accepted', color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  out_for_delivery: { label: 'Out for Delivery', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  delivered: { label: 'Delivered', color: 'text-success', bg: 'bg-success/10' },
  cancelled: { label: 'Cancelled', color: 'text-danger', bg: 'bg-danger/10' },
};
const ACTIONS = {
  pending: [{ status: 'accepted', label: 'Accept', cls: 'bg-success text-bg' }, { status: 'cancelled', label: 'Cancel', cls: 'bg-transparent border border-danger text-danger' }],
  accepted: [{ status: 'out_for_delivery', label: 'Out for Delivery', cls: 'bg-primary text-bg' }, { status: 'cancelled', label: 'Cancel', cls: 'bg-transparent border border-danger text-danger' }],
  out_for_delivery: [],
  delivered: [], cancelled: [],
};

const IncomingOrders = ({ businessId }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [deliveryCode, setDeliveryCode] = useState('');
  const token = localStorage.getItem('token');
  const intervalRef = useRef(null);

  // OTP modal state
  const [otpModal, setOtpModal] = useState(null); // order object
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Fetch delivery code for OTP verification
  useEffect(() => {
    if (!businessId || !token) return;
    (async () => {
      try {
        const res = await axios.get(`${API}/api/businesses/my`, { headers: { Authorization: `Bearer ${token}` } });
        const biz = res.data.find(b => b.id === businessId);
        if (biz) setDeliveryCode(biz.delivery_code || '');
      } catch (err) { console.error(err); }
    })();
  }, [businessId, token]);

  const fetchOrders = useCallback(async () => {
    try { const res = await axios.get(`${API}/api/orders?business_id=${businessId}`, { headers: { Authorization: `Bearer ${token}` } }); setOrders(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [businessId, token]);

  useEffect(() => {
    if (!businessId) return;
    fetchOrders();
    intervalRef.current = setInterval(fetchOrders, 10000);
    return () => clearInterval(intervalRef.current);
  }, [businessId, fetchOrders]);

  const handleStatusUpdate = async (orderId, status) => {
    setUpdating(orderId);
    try { await axios.patch(`${API}/api/orders/${orderId}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } }); await fetchOrders(); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setUpdating(null); }
  };

  const handleVerifyOtp = async () => {
    if (!otpModal || otpValue.length !== 6) return;
    setVerifying(true);
    setOtpError('');
    try {
      const res = await axios.post(`${API}/api/delivery/orders/${otpModal.id}/verify-otp`, {
        delivery_code: deliveryCode,
        otp: otpValue,
      });
      if (res.data.success) {
        setOtpModal(null);
        setOtpValue('');
        fetchOrders();
      } else if (res.data.cancelled) {
        setOtpModal(null);
        setOtpValue('');
        setOtpError('');
        fetchOrders();
      } else {
        setOtpError(`Wrong OTP — ${res.data.attempts_remaining} attempts remaining`);
        setOtpValue('');
      }
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Verification failed');
    }
    finally { setVerifying(false); }
  };

  if (!businessId) return <div className="text-center py-16 text-text2">Select a business to view orders.</div>;
  if (loading) return <div className="text-center py-16 text-text2">Loading orders...</div>;

  const active = orders.filter(o => o.status !== 'cancelled');
  const cancelled = orders.filter(o => o.status === 'cancelled');

  if (orders.length === 0) return (
    <div className="text-center py-16">
      <p className="text-4xl mb-3">📋</p>
      <h3 className="text-lg font-semibold mb-1">No Orders Yet</h3>
      <p className="text-text2 text-sm">New orders will appear here automatically.</p>
    </div>
  );

  const renderOrder = order => {
    const s = STATUS[order.status] || STATUS.pending;
    const actions = ACTIONS[order.status] || [];
    return (
      <div key={order.id} className="bg-surface2 rounded-xl p-4 mb-3">
        <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
          <div>
            <span className="font-semibold text-sm">#{order.id}</span>
            <span className="text-text2 text-xs ml-2">{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.color} ${s.bg}`}>{s.label}</span>
        </div>
        <div className="text-sm mb-1"><strong>{order.customer_name}</strong>{order.customer_phone && <span className="text-text2"> · {order.customer_phone}</span>}</div>
        <div className="text-xs text-text2 mb-3">📍 {order.delivery_address}</div>
        <div className="bg-bg rounded-lg p-2.5 mb-3">
          {order.items?.filter(Boolean).map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1 border-b border-surface2 last:border-0">
              <span>{item.product_name} <span className="text-text2">× {item.quantity}</span></span>
              <span>₹{parseFloat(item.line_total).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-text2"><span>Subtotal</span><span>₹{parseFloat(order.subtotal).toFixed(2)}</span></div>
        <div className="flex justify-between text-xs text-text2"><span>Delivery</span><span>₹{parseFloat(order.delivery_fee).toFixed(2)}</span></div>
        <div className="flex justify-between text-sm font-bold mt-1 pt-1 border-t border-border"><span>Total</span><span className="text-primary">₹{parseFloat(order.total).toFixed(2)}</span></div>
        <div className="text-xs text-success mt-1">💵 {order.payment_method}</div>

        {/* Standard action buttons */}
        {actions.length > 0 && (
          <div className="flex gap-2 mt-3">
            {actions.map(a => (
              <button key={a.status} onClick={() => handleStatusUpdate(order.id, a.status)} disabled={updating === order.id}
                className={`flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer transition disabled:opacity-50 ${a.cls}`}>
                {updating === order.id ? '...' : a.label}
              </button>
            ))}
          </div>
        )}

        {/* OTP-based Mark Delivered button for out_for_delivery orders */}
        {order.status === 'out_for_delivery' && (
          <div className="mt-3">
            <button onClick={() => { setOtpModal(order); setOtpValue(''); setOtpError(''); }}
              className="w-full py-2.5 rounded-lg text-sm font-medium cursor-pointer transition"
              style={{ background: '#1DBF73', color: '#fff', border: 'none' }}>
              ✓ Mark Delivered (Enter OTP)
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {active.map(renderOrder)}
      {cancelled.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-text2 mb-3">Cancelled Orders</h4>
          {cancelled.map(renderOrder)}
        </div>
      )}

      {/* ─── OTP Verification Modal ─── */}
      {otpModal && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={() => setOtpModal(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="fixed z-[70] p-6 rounded-xl w-[90%] max-w-sm"
            style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
            <h3 className="text-lg font-bold text-white m-0 mb-1">Verify Delivery OTP</h3>
            <p className="text-xs text-white/40 m-0 mb-5">Enter the 6-digit OTP from the customer for Order #{otpModal.id}</p>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
              value={otpValue} onChange={e => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full text-center text-2xl font-bold text-white px-4 py-3 rounded-lg border-none outline-none mb-4"
              style={{ background: '#2A2A2A', letterSpacing: '0.5em', fontFamily: 'monospace', border: otpError ? '2px solid #FF4D4D' : '2px solid transparent' }}
              autoFocus
            />
            {otpError && <p className="text-xs text-red-400 m-0 mb-3 text-center">{otpError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setOtpModal(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white/60 cursor-pointer transition"
                style={{ background: '#2A2A2A', border: 'none' }}>
                Cancel
              </button>
              <button onClick={handleVerifyOtp} disabled={otpValue.length !== 6 || verifying}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold cursor-pointer border-none transition disabled:opacity-50"
                style={{ background: '#1DBF73', color: '#fff' }}>
                {verifying ? 'Verifying...' : 'Verify & Complete'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default IncomingOrders;
