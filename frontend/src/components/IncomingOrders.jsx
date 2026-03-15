import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  out_for_delivery: [{ status: 'delivered', label: 'Mark Delivered', cls: 'bg-transparent border border-text text-text' }],
  delivered: [], cancelled: [],
};

const IncomingOrders = ({ businessId }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const token = localStorage.getItem('token');
  const intervalRef = useRef(null);

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
    </div>
  );
};

export default IncomingOrders;
