import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import CreateBusiness from './CreateBusiness';
import ProductForm from '../components/ProductForm';
import IncomingOrders from '../components/IncomingOrders';
import Navbar from '../components/Navbar';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';
const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || `${API}/uploads`;
const SIDEBAR_TABS = [
  { key: 'orders', label: 'Incoming Orders', icon: '📦' },
  { key: 'businesses', label: 'My Businesses', icon: '🏪' },
  { key: 'products', label: 'My Products', icon: '📋' },
  { key: 'analytics', label: 'Analytics', icon: '📊' },
  { key: 'stock', label: 'Update Stock', icon: '📦' },
];

/* ═══════════════ Analytics Tab — Full Dashboard ═══════════════ */
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Skeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-xl" style={{ background: '#1C1C1C' }} />)}
    </div>
    <div className="h-72 rounded-xl" style={{ background: '#1C1C1C' }} />
    <div className="grid grid-cols-3 gap-3">
      {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl" style={{ background: '#1C1C1C' }} />)}
    </div>
    <div className="h-96 rounded-xl" style={{ background: '#1C1C1C' }} />
  </div>
);

const AnalyticsTab = ({ businesses, selectedBiz, setSelectedBiz, token }) => {
  const [data, setData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!selectedBiz) return;
    setLoading(true);
    try {
      const [analyticsRes, topRes] = await Promise.all([
        axios.get(`${API}/api/orders/analytics`, { params: { business_id: selectedBiz }, headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/api/orders/top-products`, { params: { business_id: selectedBiz, days: 30 }, headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setData(analyticsRes.data);
      setTopProducts(topRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [selectedBiz, token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-white">Analytics</h2>
      {businesses.length > 0 && (
        <select value={selectedBiz || ''} onChange={e => setSelectedBiz(parseInt(e.target.value))}
          className="glass-input px-4 py-2.5 text-sm rounded-lg mb-5">
          {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
        </select>
      )}
      <Skeleton />
    </div>
  );

  const monthly = data?.monthly || [];
  const summary = data?.summary || {};
  const hasAnyData = monthly.some(m => m.order_count > 0);

  // Empty state
  if (!hasAnyData) return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-white">Analytics</h2>
      {businesses.length > 0 && (
        <select value={selectedBiz || ''} onChange={e => setSelectedBiz(parseInt(e.target.value))}
          className="glass-input px-4 py-2.5 text-sm rounded-lg mb-5">
          {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
        </select>
      )}
      <div className="text-center py-24">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-bold text-white mb-2">No sales data yet</h3>
        <p className="text-white/40 text-sm">Complete your first order to see analytics here</p>
      </div>
    </div>
  );

  // KPI calculations
  const now = new Date();
  const curMonthIdx = monthly.length - 1;
  const prevMonthIdx = monthly.length - 2;
  const thisMonthRev = curMonthIdx >= 0 ? parseFloat(monthly[curMonthIdx].revenue) + parseFloat(monthly[curMonthIdx].logistics_fees) : 0;
  const lastMonthRev = prevMonthIdx >= 0 ? parseFloat(monthly[prevMonthIdx].revenue) + parseFloat(monthly[prevMonthIdx].logistics_fees) : 0;
  const last3Rev = monthly.slice(-3).reduce((s, m) => s + parseFloat(m.revenue) + parseFloat(m.logistics_fees), 0);
  const prev3Rev = monthly.slice(-6, -3).reduce((s, m) => s + parseFloat(m.revenue) + parseFloat(m.logistics_fees), 0);
  const thisYearRev = monthly.filter(m => m.year === now.getFullYear()).reduce((s, m) => s + parseFloat(m.revenue) + parseFloat(m.logistics_fees), 0);
  const lastYearRev = (data?.yearly || []).filter(y => y.year === now.getFullYear() - 1).reduce((s, y) => parseFloat(y.revenue) + parseFloat(y.logistics_fees), 0);

  const delta = (curr, prev) => {
    if (prev === 0) return curr > 0 ? { pct: 100, up: true } : { pct: 0, up: true };
    const pct = ((curr - prev) / prev * 100).toFixed(1);
    return { pct: Math.abs(pct), up: curr >= prev };
  };

  const kpis = [
    { label: 'This Month', value: thisMonthRev, d: delta(thisMonthRev, lastMonthRev), sub: 'vs last month' },
    { label: 'Last Month', value: lastMonthRev, d: delta(lastMonthRev, prevMonthIdx >= 1 ? parseFloat(monthly[prevMonthIdx - 1]?.revenue || 0) + parseFloat(monthly[prevMonthIdx - 1]?.logistics_fees || 0) : 0), sub: 'vs month before' },
    { label: 'Last 3 Months', value: last3Rev, d: delta(last3Rev, prev3Rev), sub: 'vs prior 3 months' },
    { label: 'This Year', value: thisYearRev, d: delta(thisYearRev, lastYearRev), sub: 'vs last year' },
  ];

  // Chart data — last 3 months
  const last3Months = monthly.slice(-3);
  const chartData = {
    labels: last3Months.map(m => m.month),
    datasets: [
      {
        label: 'Revenue',
        data: last3Months.map(m => parseFloat(m.revenue)),
        backgroundColor: '#F8C200',
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        label: 'Logistics Fees',
        data: last3Months.map(m => parseFloat(m.logistics_fees)),
        backgroundColor: '#1DBF73',
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        label: 'Orders',
        data: last3Months.map(m => m.order_count),
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 4,
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: 'rgba(255,255,255,0.6)', padding: 16, usePointStyle: true, pointStyleWidth: 12 } },
      tooltip: { backgroundColor: '#1C1C1C', titleColor: '#fff', bodyColor: '#fff', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 12 },
    },
    scales: {
      x: { grid: { color: '#2A2A2A' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
      y: { position: 'left', grid: { color: '#2A2A2A' }, ticks: { color: 'rgba(255,255,255,0.5)', callback: v => '₹' + v } },
      y1: { position: 'right', grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.3)' } },
    },
  };

  // Current month label
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentMonthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const fmt = n => n >= 1000 ? `₹${(n/1000).toFixed(1)}k` : `₹${n.toFixed(0)}`;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-white">Analytics</h2>
      {businesses.length > 0 && (
        <select value={selectedBiz || ''} onChange={e => setSelectedBiz(parseInt(e.target.value))}
          className="glass-input px-4 py-2.5 text-sm rounded-lg mb-5">
          {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
        </select>
      )}

      {/* ─── Section 1: KPI Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {kpis.map((k, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: '#1C1C1C', borderTop: '3px solid #F8C200' }}>
            <p className="text-xs text-white/40 m-0 mb-1">{k.label}</p>
            <p className="text-[22px] font-bold text-white m-0">₹{k.value.toFixed(0)}</p>
            <p className="text-xs m-0 mt-1.5" style={{ color: k.d.up ? '#1DBF73' : '#FF4D4D' }}>
              {k.d.up ? '▲' : '▼'} {k.d.pct}% <span className="text-white/30">{k.sub}</span>
            </p>
          </div>
        ))}
      </div>

      {/* ─── Section 2: Bar Chart ─── */}
      <div className="rounded-xl p-4 mb-6" style={{ background: '#1C1C1C', height: 340 }}>
        <p className="text-sm font-semibold text-white/60 m-0 mb-3">Last 3 Months Comparison</p>
        <div style={{ height: 280 }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* ─── Section 3: Revenue Summary Strip ─── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: '3 Month Revenue', data: summary.last_3_months },
          { label: '6 Month Revenue', data: summary.last_6_months },
          { label: '12 Month Revenue', data: summary.last_12_months },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: '#2A2A2A' }}>
            <p className="text-xs text-white/40 m-0 mb-1">{s.label}</p>
            <p className="text-lg font-bold text-white m-0">₹{(s.data?.revenue + s.data?.logistics_fees || 0).toFixed(0)}</p>
            <p className="text-xs text-white/30 m-0 mt-1">{s.data?.order_count || 0} orders</p>
          </div>
        ))}
      </div>

      {/* ─── Section 4: 12 Month Table ─── */}
      <div className="rounded-xl overflow-x-auto mb-6" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
              <th className="text-left px-4 py-3 text-white/50 font-medium">Month</th>
              <th className="text-right px-4 py-3 text-white/50 font-medium">Orders</th>
              <th className="text-right px-4 py-3 text-white/50 font-medium">Revenue (₹)</th>
              <th className="text-right px-4 py-3 text-white/50 font-medium">Logistics (₹)</th>
              <th className="text-right px-4 py-3 text-white/50 font-medium">Total Earned (₹)</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((row, i) => {
              const isCurrent = row.month === currentMonthLabel;
              const hasOrders = row.order_count > 0;
              const earned = parseFloat(row.revenue) + parseFloat(row.logistics_fees);
              return (
                <tr key={i} style={{
                  background: i % 2 === 0 ? '#1C1C1C' : '#2A2A2A',
                  borderLeft: isCurrent ? '4px solid #F8C200' : '4px solid transparent',
                }}>
                  <td className="px-4 py-3 text-white font-medium">{row.month}</td>
                  <td className="px-4 py-3 text-right text-white/70">{hasOrders ? row.order_count : <span className="text-white/20">—</span>}</td>
                  <td className="px-4 py-3 text-right text-white/70">{hasOrders ? `₹${parseFloat(row.revenue).toFixed(2)}` : <span className="text-white/20">—</span>}</td>
                  <td className="px-4 py-3 text-right text-white/70">{hasOrders ? `₹${parseFloat(row.logistics_fees).toFixed(2)}` : <span className="text-white/20">—</span>}</td>
                  <td className="px-4 py-3 text-right text-primary font-semibold">{hasOrders ? `₹${earned.toFixed(2)}` : <span className="text-white/20">—</span>}</td>
                </tr>
              );
            })}
            {/* Totals row */}
            <tr style={{ background: 'rgba(248,194,0,0.08)', borderTop: '2px solid rgba(248,194,0,0.3)' }}>
              <td className="px-4 py-3 text-white font-bold">Total (12 months)</td>
              <td className="px-4 py-3 text-right text-white font-bold">{monthly.reduce((s, r) => s + r.order_count, 0)}</td>
              <td className="px-4 py-3 text-right text-white font-bold">₹{monthly.reduce((s, r) => s + parseFloat(r.revenue), 0).toFixed(2)}</td>
              <td className="px-4 py-3 text-right text-white font-bold">₹{monthly.reduce((s, r) => s + parseFloat(r.logistics_fees), 0).toFixed(2)}</td>
              <td className="px-4 py-3 text-right text-primary font-bold">₹{monthly.reduce((s, r) => s + parseFloat(r.revenue) + parseFloat(r.logistics_fees), 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── Section 5: Top Products ─── */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-4 py-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-semibold text-white/60 m-0">🏆 Best Selling Products (Last 30 Days)</p>
        </div>
        {topProducts.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">No product sales in the last 30 days</div>
        ) : (
          topProducts.map((p, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3" style={{ background: i % 2 === 0 ? '#1C1C1C' : '#2A2A2A' }}>
              <span className="text-primary font-bold text-lg w-6 text-center shrink-0">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white m-0 truncate">{p.product_name}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-white m-0">{p.units_sold} units</p>
                <p className="text-xs text-white/40 m-0">₹{parseFloat(p.revenue).toFixed(0)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/* ═══════════════ Update Stock Tab ═══════════════ */
const StockRow = ({ product, token, onUpdated }) => {
  const [qty, setQty] = useState(product.stock_qty);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // 'ok' | 'err'
  const imgUrl = product.image1_url ? `${UPLOADS_URL}${product.image1_url.replace(/^\/uploads/, '')}` : null;

  const handleSave = async () => {
    const parsed = parseInt(qty, 10);
    if (isNaN(parsed) || parsed < 0) { setStatus('err'); setTimeout(() => setStatus(null), 2000); return; }
    setSaving(true);
    try {
      const res = await axios.patch(`${API}/api/products/${product.id}/stock`,
        { stock_qty: parsed },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onUpdated(product.id, res.data.stock_qty);
      setStatus('ok');
      setTimeout(() => setStatus(null), 2000);
    } catch {
      setStatus('err');
      setTimeout(() => setStatus(null), 2000);
    } finally { setSaving(false); }
  };

  const badgeColor = product.stock_qty === 0 ? { bg: 'rgba(255,77,77,0.15)', text: '#FF4D4D' }
    : product.stock_qty <= 5 ? { bg: 'rgba(248,194,0,0.15)', text: '#F8C200' }
    : product.stock_qty <= 10 ? { bg: 'rgba(248,194,0,0.1)', text: '#F8C200' }
    : { bg: 'rgba(29,191,115,0.15)', text: '#1DBF73' };

  return (
    <div className="flex items-center gap-4 px-4 md:px-5" style={{ minHeight: 72, background: '#1C1C1C', borderBottom: '1px solid #2A2A2A' }}>
      {/* Image */}
      <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {imgUrl ? <img src={imgUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/20 text-[10px]">N/A</div>}
      </div>

      {/* Name + unit */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-white m-0 leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.name}</p>
        <p className="text-xs text-white/40 m-0 mt-0.5">/{product.unit}</p>
      </div>

      {/* Stock badge */}
      <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: badgeColor.bg, color: badgeColor.text }}>
        {product.stock_qty}
      </span>

      {/* Input + Save */}
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number" min="0" value={qty}
          onChange={e => setQty(e.target.value)}
          className="w-20 px-3 py-2 text-sm text-white text-center rounded-lg border-none outline-none"
          style={{
            background: '#2A2A2A',
            border: status === 'err' ? '2px solid #FF4D4D' : '2px solid transparent',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = '#F8C200'; }}
          onBlur={e => { if (status !== 'err') e.target.style.borderColor = 'transparent'; }}
        />
        <motion.button onClick={handleSave} disabled={saving}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="px-3 py-2 bg-primary text-black text-xs font-bold rounded-lg cursor-pointer border-none transition disabled:opacity-50"
          style={{ minWidth: 48 }}>
          {status === 'ok' ? '✓' : saving ? '...' : 'Save'}
        </motion.button>
      </div>
    </div>
  );
};

const UpdateStockTab = ({ businesses, selectedBiz, setSelectedBiz, products, setProducts, token }) => {
  const filtered = products.filter(p => !selectedBiz || p.business_id === selectedBiz);

  // Sort: out of stock → low stock → normal
  const sorted = [...filtered].sort((a, b) => {
    const groupA = a.stock_qty === 0 ? 0 : a.stock_qty <= 5 ? 1 : 2;
    const groupB = b.stock_qty === 0 ? 0 : b.stock_qty <= 5 ? 1 : 2;
    if (groupA !== groupB) return groupA - groupB;
    return a.name.localeCompare(b.name);
  });

  const handleUpdated = (productId, newQty) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock_qty: newQty } : p));
  };

  let lastGroup = -1;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 text-white">Update Stock</h2>
      {businesses.length > 0 && (
        <select value={selectedBiz || ''} onChange={e => setSelectedBiz(parseInt(e.target.value))}
          className="glass-input px-4 py-2.5 text-sm rounded-lg mb-4">
          {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
        </select>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-white/40">No products for this business.</div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          {sorted.map(product => {
            const group = product.stock_qty === 0 ? 0 : product.stock_qty <= 5 ? 1 : 2;
            const showHeader = group !== lastGroup;
            lastGroup = group;
            const labels = { 0: '🔴 Out of Stock', 1: '🟡 Low Stock (≤5)', 2: '🟢 In Stock' };

            return (
              <React.Fragment key={product.id}>
                {showHeader && (
                  <div className="px-4 py-2 text-xs font-semibold text-white/40 uppercase tracking-wide" style={{ background: '#161616' }}>
                    {labels[group]}
                  </div>
                )}
                <StockRow product={product} token={token} onUpdated={handleUpdated} />
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══════════════ Dashboard ═══════════════ */
const Dashboard = () => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [products, setProducts] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [selectedBiz, setSelectedBiz] = useState(null);
  const [tab, setTab] = useState('orders');
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  const fetchBusinesses = async () => {
    try {
      const res = await axios.get(`${API}/api/businesses/my`, { headers: { Authorization: `Bearer ${token}` } });
      setBusinesses(res.data);
      if (res.data.length > 0 && !selectedBiz) setSelectedBiz(res.data[0].id);
    } catch (err) { console.error(err); }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API}/api/products/my`, { headers: { Authorization: `Bearer ${token}` } });
      setProducts(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (!token) { navigate('/login'); return; }
    if (role !== 'retailer') { navigate('/market'); return; }
    Promise.all([fetchBusinesses(), fetchProducts()]).then(() => setLoading(false));
    axios.post(`${API}/api/businesses/backfill-cities`, {}, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (res.data.updated > 0) fetchBusinesses(); })
      .catch(() => {});
  }, [navigate]);

  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('authToken'); localStorage.removeItem('authUser'); localStorage.removeItem('role'); localStorage.removeItem('cartData'); localStorage.removeItem('selectedDeliveryAddress'); localStorage.removeItem('selectedCity'); navigate('/login'); };
  const handleDeleteProduct = async id => {
    if (!window.confirm('Delete this product?')) return;
    try { await axios.delete(`${API}/api/products/${id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchProducts(); }
    catch (err) { console.error(err); }
  };

  const Modal = ({ children, onClose }) => (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg glass-card p-6 z-[70] overflow-y-auto max-h-[90vh]"
      >
        {children}
      </motion.div>
    </>
  );

  return (
    <div className="min-h-screen">
      <Navbar onCartOpen={() => {}} />

      <div className="pt-16 flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex flex-col w-56 h-[calc(100vh-64px)] fixed left-0 top-16 p-4 gap-1 glass-nav" style={{ borderRight: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none' }}>
          {SIDEBAR_TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left border-none cursor-pointer transition w-full
                ${tab === t.key ? 'bg-primary/15 text-primary' : 'bg-transparent text-white/40 hover:bg-white/5 hover:text-white/70'}`}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400 bg-transparent border-none cursor-pointer hover:bg-red-500/10 transition">
            Logout
          </button>
        </aside>

        {/* Mobile bottom tabs */}
        <nav className="fixed z-[1000] flex md:hidden items-center px-2 py-1" style={{ bottom: 24, left: '50%', transform: 'translateX(-50%)', width: 'fit-content', gap: 4, background: '#0C0C0C', borderTop: '1px solid #2A2A2A', borderRadius: 24 }}>
          {SIDEBAR_TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex flex-col items-center justify-center border-none cursor-pointer text-[10px] transition px-3 py-1.5 rounded-full font-medium"
              style={{
                color: tab === t.key ? '#F8C200' : 'rgba(255,255,255,0.4)',
                background: tab === t.key ? 'rgba(248,194,0,0.1)' : 'transparent',
                minWidth: 52,
              }}>
              <span className="text-base">{t.icon}</span>
              <span>{t.label.split(' ').slice(-1)[0]}</span>
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 md:ml-56 p-4 md:p-8 pb-28 md:pb-8 max-w-5xl">
          {loading ? (
            <div className="text-center py-20 text-white/40">Loading...</div>
          ) : (
            <>
              {/* INCOMING ORDERS */}
              {tab === 'orders' && (
                <div>
                  <h2 className="text-xl font-bold mb-4 text-white">Incoming Orders</h2>
                  {businesses.length > 0 && (
                    <div className="flex items-center gap-3 mb-5">
                      <select value={selectedBiz || ''} onChange={e => setSelectedBiz(parseInt(e.target.value))}
                        className="glass-input px-4 py-2.5 text-sm rounded-lg">
                        {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
                      </select>
                      <span className="text-[11px] text-white/30">Auto-refreshes every 10s</span>
                    </div>
                  )}
                  <IncomingOrders businessId={selectedBiz} />
                </div>
              )}

              {/* MY BUSINESSES */}
              {tab === 'businesses' && (
                <div>
                  <div className="flex justify-between items-center mb-5">
                    <h2 className="text-xl font-bold m-0 text-white">Your Businesses <span className="text-white/40 text-sm font-normal">({businesses.length})</span></h2>
                    <motion.button onClick={() => setShowCreate(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="px-4 py-2 bg-primary text-black font-medium text-sm rounded-full cursor-pointer border-none transition"
                      style={{ boxShadow: '0 0 15px rgba(248,194,0,0.2)' }}>
                      + Add New Business
                    </motion.button>
                  </div>
                  {businesses.length === 0 ? (
                    <div className="glass-card p-10 text-center">
                      <p className="text-4xl mb-3">🏪</p>
                      <h3 className="text-lg font-semibold mb-1 text-white">No Businesses Yet</h3>
                      <p className="text-white/40 text-sm mb-4">Create your first business to start receiving orders.</p>
                      <motion.button onClick={() => setShowCreate(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="px-6 py-2.5 bg-primary text-black font-medium text-sm rounded-full cursor-pointer border-none transition"
                        style={{ boxShadow: '0 0 15px rgba(248,194,0,0.2)' }}>
                        + Create Business
                      </motion.button>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {businesses.map(biz => (
                        <div key={biz.id} className="glass-card glass-card-hover p-5 cursor-pointer"
                          onClick={() => { setSelectedBiz(biz.id); setTab('orders'); }}>
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-base font-semibold m-0 text-white">{biz.business_name}</h3>
                            <span className={`glass-pill text-xs font-medium px-2 py-1 ${biz.is_active ? 'text-green-400' : 'text-red-400'}`}>
                              {biz.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-xs text-white/40 m-0 mb-2">{biz.business_address}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {biz.tags?.map(tag => (
                              <span key={tag} className="glass-pill text-[11px] px-2 py-0.5 text-primary">{tag}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MY PRODUCTS */}
              {tab === 'products' && (
                <div>
                  <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold m-0 text-white">My Products</h2>
                      {businesses.length > 0 && (
                        <select value={selectedBiz || ''} onChange={e => setSelectedBiz(parseInt(e.target.value))}
                          className="glass-input px-3 py-2 text-sm rounded-lg">
                          {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
                        </select>
                      )}
                    </div>
                    <motion.button onClick={() => { setEditProduct(null); setShowProductForm(true); }} disabled={!selectedBiz}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="px-4 py-2 bg-primary text-black font-medium text-sm rounded-full cursor-pointer border-none transition disabled:opacity-50"
                      style={{ boxShadow: '0 0 15px rgba(248,194,0,0.2)' }}>
                      + Add Product
                    </motion.button>
                  </div>
                  {products.filter(p => !selectedBiz || p.business_id === selectedBiz).length === 0 ? (
                    <div className="glass-card p-10 text-center">
                      <p className="text-4xl mb-3">📋</p>
                      <h3 className="text-lg font-semibold mb-1 text-white">No Products Yet</h3>
                      <p className="text-white/40 text-sm">Add your first product to start selling.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {products.filter(p => !selectedBiz || p.business_id === selectedBiz).map(product => (
                        <div key={product.id} className="glass-card glass-card-hover overflow-hidden relative group">
                          <div className="w-full overflow-hidden relative" style={{ height: 160 }}>
                            {product.image1_url ? (
                              <img src={`${UPLOADS_URL}${product.image1_url.replace(/^\/uploads/, '')}`} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/20 text-xs" style={{ background: 'rgba(255,255,255,0.03)' }}>No Image</div>
                            )}
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
                              <button onClick={() => { setEditProduct(product); setShowProductForm(true); }}
                                className="w-9 h-9 rounded-full glass-pill cursor-pointer text-white flex items-center justify-center hover:bg-white/15 transition" title="Edit">✏️</button>
                              <button onClick={() => handleDeleteProduct(product.id)}
                                className="w-9 h-9 rounded-full glass-pill cursor-pointer text-red-400 flex items-center justify-center hover:bg-red-500/15 transition" title="Delete">🗑️</button>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-medium m-0 truncate text-white">{product.name}</p>
                            <p className="text-xs text-primary m-0 mt-0.5 font-bold">₹{product.price} / {product.unit}</p>
                            <p className="text-xs text-white/30 m-0 mt-0.5">Stock: {product.stock_qty} · {product.is_available ? '✓' : '✗'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ANALYTICS */}
              {tab === 'analytics' && (
                <AnalyticsTab businesses={businesses} selectedBiz={selectedBiz} setSelectedBiz={setSelectedBiz} token={token} />
              )}

              {/* UPDATE STOCK */}
              {tab === 'stock' && (
                <UpdateStockTab businesses={businesses} selectedBiz={selectedBiz} setSelectedBiz={setSelectedBiz} products={products} setProducts={setProducts} token={token} />
              )}
            </>
          )}
        </main>
      </div>

      {/* MODALS */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)}>
          <CreateBusiness onComplete={() => { setShowCreate(false); fetchBusinesses(); }} />
        </Modal>
      )}
      {showProductForm && (
        <Modal onClose={() => { setShowProductForm(false); setEditProduct(null); }}>
          <ProductForm product={editProduct} businessId={selectedBiz}
            onSave={() => { setShowProductForm(false); setEditProduct(null); fetchProducts(); }}
            onCancel={() => { setShowProductForm(false); setEditProduct(null); }} />
        </Modal>
      )}

      {/* FAB */}
      {tab !== 'businesses' && tab !== 'analytics' && tab !== 'stock' && !showCreate && !showProductForm && selectedBiz && (
        <motion.button
          onClick={() => { setEditProduct(null); setShowProductForm(true); setTab('products'); }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-28 md:bottom-8 right-6 w-14 h-14 rounded-full bg-primary text-black text-2xl font-bold border-none cursor-pointer flex items-center justify-center z-40"
          style={{ boxShadow: '0 0 30px rgba(248,194,0,0.4)' }}
        >
          +
        </motion.button>
      )}
    </div>
  );
};

export default Dashboard;
