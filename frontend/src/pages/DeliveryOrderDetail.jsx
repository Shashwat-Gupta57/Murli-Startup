import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';

const STATUS_BADGE = {
  accepted: { label: 'ACCEPTED', bg: '#F8C200', color: '#000' },
  out_for_delivery: { label: 'OUT FOR DELIVERY', bg: '#185FA5', color: '#fff' },
  delivered: { label: 'DELIVERED', bg: '#1DBF73', color: '#fff' },
};

const DeliveryOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);
  const [otpError, setOtpError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [delivered, setDelivered] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('deliverySession'));
      if (!s || !s.delivery_code) { navigate('/login'); return; }
      setSession(s);
    } catch { navigate('/login'); }
  }, [navigate]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const res = await axios.get(`${API}/api/delivery/orders`, {
          params: { delivery_code: session.delivery_code },
        });
        const found = res.data.find(o => String(o.id) === String(id));
        if (found) setOrder(found);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [session, id]);

  const handleStartDelivery = async () => {
    setActionLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      await axios.patch(`${API}/api/delivery/orders/${id}/out-for-delivery`, {
        delivery_code: session.delivery_code,
      });
      setOrder(prev => ({ ...prev, status: 'out_for_delivery' }));
      setActionSuccess('Order is now out for delivery!');
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to update');
    }
    finally { setActionLoading(false); }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setOtpError('');
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    setActionLoading(true);
    setOtpError('');
    try {
      const res = await axios.post(`${API}/api/delivery/orders/${id}/verify-otp`, {
        delivery_code: session.delivery_code,
        otp: code,
      });
      if (res.data.success) {
        setDelivered(true);
      } else if (res.data.cancelled) {
        setCancelled(true);
      } else {
        setAttemptsLeft(res.data.attempts_remaining);
        setOtpError(`WRONG CODE — ${res.data.attempts_remaining} ATTEMPTS LEFT`);
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Verification failed');
    }
    finally { setActionLoading(false); }
  };

  if (!session || loading) return (
    <div style={{ background: '#030308', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>Loading...</p>
    </div>
  );

  if (!order) return (
    <div style={{ background: '#030308', minHeight: '100vh', padding: 20 }}>
      <button onClick={() => navigate('/delivery')}
        style={{ width: '100%', height: 52, background: '#1C1C1C', border: 'none', borderRadius: 12, color: '#fff', fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginBottom: 20 }}>
        ← BACK TO ORDERS
      </button>
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Order not found</p>
      </div>
    </div>
  );

  const badge = STATUS_BADGE[order.status] || STATUS_BADGE.accepted;

  return (
    <div style={{ background: '#030308', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#0C0C0C', height: 64, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid #2A2A2A', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ color: '#F8C200', fontWeight: 'bold', fontSize: 18 }}>📦 MURLI DELIVERY</div>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Back button */}
        <button onClick={() => navigate('/delivery')}
          style={{ width: '100%', height: 52, background: '#1C1C1C', border: 'none', borderRadius: 12, color: '#fff', fontSize: 16, fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' }}>
          ← BACK TO ORDERS
        </button>

        {/* Order ID card */}
        <div style={{ background: '#F8C200', borderRadius: 16, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#000', fontSize: 32, fontWeight: 'bold', margin: 0 }}>ORDER #{order.id}</p>
        </div>

        {/* Customer info */}
        <div style={{ background: '#1C1C1C', borderRadius: 16, padding: 20, border: '1px solid #2A2A2A' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: 1 }}>DELIVER TO:</p>
          <p style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', margin: '0 0 6px 0' }}>{order.customer_name}</p>
          {order.customer_phone && <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 17, margin: '0 0 6px 0' }}>📞 {order.customer_phone}</p>}
          <p style={{ color: '#fff', fontSize: 17, margin: 0 }}>📍 {order.delivery_address}</p>
        </div>

        {/* Items */}
        <div style={{ background: '#1C1C1C', borderRadius: 16, padding: 20, border: '1px solid #2A2A2A' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: 1 }}>ITEMS IN THIS ORDER:</p>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < order.items.length - 1 ? '1px solid #2A2A2A' : 'none' }}>
              <span style={{ color: '#fff', fontSize: 17 }}>{item.product_name}</span>
              <span style={{ color: '#F8C200', fontSize: 17, fontWeight: 'bold' }}>×{item.quantity}</span>
            </div>
          ))}
          <div style={{ borderTop: '2px solid #2A2A2A', marginTop: 12, paddingTop: 12 }}>
            <p style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', margin: 0, textAlign: 'right' }}>
              TOTAL: ₹{parseFloat(order.total).toFixed(0)}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div style={{ background: badge.bg, color: badge.color, borderRadius: 999, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 'bold' }}>
          {delivered ? '✓ DELIVERED' : badge.label}
        </div>

        {/* ─── Action Section ─── */}
        {delivered ? (
          <div style={{ background: '#1DBF73', borderRadius: 16, padding: '30px 20px', textAlign: 'center', minHeight: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', margin: '0 0 8px 0' }}>✓ DELIVERED!</p>
            <p style={{ color: '#fff', fontSize: 16, margin: 0 }}>Order completed successfully</p>
          </div>
        ) : cancelled ? (
          <div style={{ background: '#DC2626', borderRadius: 16, padding: '30px 20px', textAlign: 'center', minHeight: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', margin: '0 0 8px 0' }}>ORDER CANCELLED</p>
            <p style={{ color: '#fff', fontSize: 16, margin: 0 }}>Too many wrong codes</p>
          </div>
        ) : order.status === 'accepted' ? (
          <div>
            <button onClick={handleStartDelivery} disabled={actionLoading}
              style={{ width: '100%', height: 64, background: '#F8C200', color: '#000', border: 'none', borderRadius: 12, fontSize: 20, fontWeight: 'bold', cursor: 'pointer', opacity: actionLoading ? 0.6 : 1 }}>
              {actionLoading ? 'UPDATING...' : 'TAP TO START DELIVERY'}
            </button>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', margin: '12px 0 0 0' }}>
              Tap this when you pick up the order and leave for delivery
            </p>
            {actionError && <p style={{ color: '#DC2626', fontSize: 18, fontWeight: 'bold', textAlign: 'center', margin: '16px 0 0 0' }}>{actionError}</p>}
            {actionSuccess && <p style={{ color: '#1DBF73', fontSize: 18, fontWeight: 'bold', textAlign: 'center', margin: '16px 0 0 0' }}>{actionSuccess}</p>}
          </div>
        ) : order.status === 'out_for_delivery' ? (
          <div style={{ background: '#1C1C1C', borderRadius: 16, padding: 20, border: '1px solid #2A2A2A' }}>
            <p style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', margin: '0 0 8px 0' }}>DELIVERY OTP</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, margin: '0 0 20px 0' }}>Ask the customer for their 6-digit OTP code</p>

            {/* OTP boxes */}
            <div style={{
              display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20,
              animation: shake ? 'shake 0.4s ease-in-out' : 'none',
            }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  style={{
                    width: 52, height: 64, background: '#2A2A2A', border: digit ? '2px solid #F8C200' : '2px solid #3A3A3A',
                    borderRadius: 12, color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center',
                    outline: 'none', caretColor: '#F8C200',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#F8C200'; }}
                  onBlur={e => { if (!digit) e.target.style.borderColor = '#3A3A3A'; }}
                />
              ))}
            </div>

            {otpError && <p style={{ color: '#DC2626', fontSize: 18, fontWeight: 'bold', textAlign: 'center', margin: '0 0 16px 0' }}>{otpError}</p>}

            <button onClick={handleVerifyOtp} disabled={otp.join('').length !== 6 || actionLoading}
              style={{ width: '100%', height: 64, background: '#F8C200', color: '#000', border: 'none', borderRadius: 12, fontSize: 20, fontWeight: 'bold', cursor: 'pointer', opacity: (otp.join('').length !== 6 || actionLoading) ? 0.5 : 1 }}>
              {actionLoading ? 'VERIFYING...' : 'CONFIRM DELIVERY'}
            </button>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', margin: '12px 0 0 0' }}>
              Enter the OTP the customer shows you on their phone
            </p>
          </div>
        ) : null}

        <div style={{ height: 40 }} />
      </div>

      {/* Shake animation keyframes */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
};

export default DeliveryOrderDetail;
