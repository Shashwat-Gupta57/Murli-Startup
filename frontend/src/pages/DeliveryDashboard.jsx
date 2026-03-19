import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';

const STATUS_BADGE = {
  accepted: { label: 'ACCEPTED', bg: '#F8C200', color: '#000' },
  out_for_delivery: { label: 'OUT FOR DELIVERY', bg: '#185FA5', color: '#fff' },
  delivered: { label: 'DELIVERED', bg: '#1DBF73', color: '#fff' },
};

const DeliveryDashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('deliverySession'));
      if (!s || !s.delivery_code) { navigate('/login'); return; }
      setSession(s);
    } catch { navigate('/login'); }
  }, [navigate]);

  // Register push
  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const reg = await navigator.serviceWorker.ready;
          const vapidRes = await axios.get(`${API}/api/push/vapid-public-key`);
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidRes.data.publicKey,
          });
          await axios.post(`${API}/api/delivery/subscribe-push`, {
            delivery_code: session.delivery_code,
            push_subscription: sub.toJSON(),
          });
        }
      } catch (err) { console.error('Push registration error:', err); }
    })();
  }, [session]);

  const fetchOrders = useCallback(async () => {
    if (!session) return;
    try {
      const res = await axios.get(`${API}/api/delivery/orders`, {
        params: { delivery_code: session.delivery_code },
      });
      setOrders(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    fetchOrders();
    intervalRef.current = setInterval(fetchOrders, 15000);
    return () => clearInterval(intervalRef.current);
  }, [session, fetchOrders]);

  const handleExit = () => {
    localStorage.removeItem('deliverySession');
    navigate('/login');
  };

  const filtered = orders.filter(o =>
    search ? String(o.id).includes(search) : true
  );

  if (!session) return null;

  return (
    <div style={{ background: '#030308', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#0C0C0C', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid #2A2A2A', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ color: '#F8C200', fontWeight: 'bold', fontSize: 18 }}>📦 MURLI DELIVERY</div>
        <button onClick={handleExit}
          style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '0 20px', height: 48, fontSize: 16, fontWeight: 'bold', cursor: 'pointer' }}>
          EXIT
        </button>
      </div>

      <div style={{ padding: 20 }}>
        {/* Search */}
        <input
          type="text"
          inputMode="numeric"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by order number..."
          style={{ width: '100%', height: 56, background: '#1C1C1C', border: '2px solid #2A2A2A', borderRadius: 12, color: '#fff', fontSize: 18, padding: '0 20px', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
        />

        {/* Sub header */}
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '0 0 16px 0' }}>
          {session.business_name} · {filtered.length} order{filtered.length !== 1 ? 's' : ''}
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>Loading orders...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚚</div>
            <p style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', margin: '0 0 8px 0' }}>NO ORDERS RIGHT NOW</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, margin: 0 }}>Check back soon</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(order => {
              const badge = STATUS_BADGE[order.status] || STATUS_BADGE.accepted;
              return (
                <div key={order.id}
                  onClick={() => navigate(`/delivery/order/${order.id}`)}
                  style={{ background: '#1C1C1C', borderRadius: 16, padding: 20, cursor: 'pointer', minHeight: 100, border: '1px solid #2A2A2A' }}>
                  <p style={{ color: '#F8C200', fontSize: 24, fontWeight: 'bold', margin: '0 0 6px 0' }}>ORDER #{order.id}</p>
                  <p style={{ color: '#fff', fontSize: 18, margin: '0 0 4px 0' }}>{order.customer_name}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, margin: '0 0 12px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {order.delivery_address}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', margin: 0 }}>₹{parseFloat(order.total).toFixed(0)}</p>
                    <span style={{ background: badge.bg, color: badge.color, fontSize: 16, fontWeight: 'bold', padding: '6px 16px', borderRadius: 999 }}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryDashboard;
