import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';
const STATUS = {
  pending: { label: 'Pending', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: '🕐' },
  accepted: { label: 'Accepted', color: 'text-indigo-400', bg: 'bg-indigo-400/10', icon: '✓' },
  out_for_delivery: { label: 'Out for Delivery', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: '🚴' },
  delivered: { label: 'Delivered', color: 'text-success', bg: 'bg-success/10', icon: '📦' },
  cancelled: { label: 'Cancelled', color: 'text-danger', bg: 'bg-danger/10', icon: '✕' },
};
const STEPS = ['pending', 'accepted', 'out_for_delivery', 'delivered'];

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const token = localStorage.getItem('token');

  const fetchOrders = useCallback(async () => {
    try { const res = await axios.get(`${API}/api/orders/my`, { headers: { Authorization: `Bearer ${token}` } }); setOrders(res.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    fetchOrders();
    intervalRef.current = setInterval(fetchOrders, 10000);
    return () => clearInterval(intervalRef.current);
  }, [fetchOrders]);

  if (loading) return <div className="text-center py-16 text-text2">Loading your orders...</div>;
  if (orders.length === 0) return (
    <div className="text-center py-16">
      <p className="text-4xl mb-3">🛒</p>
      <h3 className="text-lg font-semibold mb-1">No Orders Yet</h3>
      <p className="text-text2 text-sm">Your orders will appear here once you place them.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {orders.map(order => {
        const s = STATUS[order.status] || STATUS.pending;
        const currentIdx = STEPS.indexOf(order.status);
        return (
          <div key={order.id} className="bg-surface rounded-xl p-5">
            <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
              <div>
                <span className="font-semibold text-sm">Order #{order.id}</span>
                <span className="text-text2 text-xs ml-2">{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <div className="text-xs text-primary mt-1">{order.business_name}</div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.color} ${s.bg}`}>{s.icon} {s.label}</span>
            </div>

            <div className="bg-surface2 rounded-lg p-2.5 mb-3">
              {order.items?.filter(Boolean).map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-bg last:border-0">
                  <span>{item.product_name} <span className="text-text2">× {item.quantity}</span></span>
                  <span>₹{parseFloat(item.line_total).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="text-xs text-text2 mb-3">📍 {order.delivery_address}</div>
            <div className="flex justify-between text-xs text-text2"><span>Subtotal</span><span>₹{parseFloat(order.subtotal).toFixed(2)}</span></div>
            <div className="flex justify-between text-xs text-text2"><span>Delivery</span><span>₹{parseFloat(order.delivery_fee).toFixed(2)}</span></div>
            <div className="flex justify-between text-sm font-bold mt-1 pt-1 border-t border-border"><span>Total</span><span className="text-primary">₹{parseFloat(order.total).toFixed(2)}</span></div>

            {/* Progress stepper */}
            <div className="flex items-center mt-4 gap-0">
              {STEPS.map((step, i) => {
                const done = i <= currentIdx && order.status !== 'cancelled';
                const isCurrent = i === currentIdx && order.status !== 'cancelled';
                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full transition-all
                        ${done ? 'bg-primary' : 'bg-surface2'}
                        ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface scale-125' : ''}
                        ${order.status === 'cancelled' ? 'bg-danger' : ''}`} />
                      <span className="text-[10px] text-text2 max-w-[60px] text-center leading-tight">{STATUS[step]?.label}</span>
                    </div>
                    {i < 3 && <div className={`flex-1 h-0.5 mx-1 mb-5 ${i < currentIdx && order.status !== 'cancelled' ? 'bg-primary' : 'bg-surface2'}`} />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MyOrders;
