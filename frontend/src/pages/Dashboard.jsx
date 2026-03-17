import React, { useEffect, useState } from 'react';
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
];

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
        <nav className="glass-card glow-purple fixed z-50 flex md:hidden items-center px-2 py-1" style={{ bottom: 24, left: '50%', transform: 'translateX(-50%)', width: 'fit-content', gap: 4 }}>
          {SIDEBAR_TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex flex-col items-center justify-center border-none cursor-pointer text-[10px] transition px-3 py-1.5 rounded-full font-medium"
              style={{
                color: tab === t.key ? '#F8C200' : 'rgba(255,255,255,0.4)',
                background: tab === t.key ? 'rgba(248,194,0,0.1)' : 'transparent',
                minWidth: 56,
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
                            {/* Hover overlay */}
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
      {tab !== 'businesses' && !showCreate && !showProductForm && selectedBiz && (
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
