import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    // Auto-backfill city for businesses missing it
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

  // --- Modal wrapper ---
  const Modal = ({ children, onClose }) => (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-surface rounded-xl p-6 z-[70] overflow-y-auto max-h-[90vh] shadow-2xl">
        {children}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-bg">
      <Navbar onCartOpen={() => {}} />

      <div className="pt-16 flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex flex-col w-56 h-[calc(100vh-64px)] fixed left-0 top-16 bg-surface border-r border-surface2 p-4 gap-1">
          {SIDEBAR_TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left border-none cursor-pointer transition w-full
                ${tab === t.key ? 'bg-primary/15 text-primary' : 'bg-transparent text-text2 hover:bg-surface2 hover:text-text'}`}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-danger bg-transparent border-none cursor-pointer hover:bg-danger/10 transition">
            Logout
          </button>
        </aside>

        {/* Mobile bottom tabs */}
        <nav className="fixed bottom-0 left-0 right-0 h-14 bg-bg border-t border-surface2 z-50 flex md:hidden">
          {SIDEBAR_TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 border-none cursor-pointer text-[11px] transition
                ${tab === t.key ? 'text-primary bg-transparent' : 'text-text2 bg-transparent'}`}>
              <span className="text-base">{t.icon}</span>
              <span>{t.label.split(' ').slice(-1)[0]}</span>
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 md:ml-56 p-4 md:p-8 pb-20 md:pb-8 max-w-5xl">
          {loading ? (
            <div className="text-center py-20 text-text2">Loading...</div>
          ) : (
            <>
              {/* ═══ INCOMING ORDERS ═══ */}
              {tab === 'orders' && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Incoming Orders</h2>
                  {businesses.length > 0 && (
                    <div className="flex items-center gap-3 mb-5">
                      <select value={selectedBiz || ''} onChange={e => setSelectedBiz(parseInt(e.target.value))}
                        className="px-4 py-2.5 bg-surface2 border border-border rounded-lg text-text text-sm focus:border-primary focus:outline-none">
                        {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
                      </select>
                      <span className="text-[11px] text-text2">Auto-refreshes every 10s</span>
                    </div>
                  )}
                  <IncomingOrders businessId={selectedBiz} />
                </div>
              )}

              {/* ═══ MY BUSINESSES ═══ */}
              {tab === 'businesses' && (
                <div>
                  <div className="flex justify-between items-center mb-5">
                    <h2 className="text-xl font-bold m-0">Your Businesses <span className="text-text2 text-sm font-normal">({businesses.length})</span></h2>
                    <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary text-bg font-medium text-sm rounded-lg cursor-pointer border-none hover:bg-primary-hover transition">
                      + Add New Business
                    </button>
                  </div>
                  {businesses.length === 0 ? (
                    <div className="bg-surface rounded-xl p-10 text-center">
                      <p className="text-4xl mb-3">🏪</p>
                      <h3 className="text-lg font-semibold mb-1">No Businesses Yet</h3>
                      <p className="text-text2 text-sm mb-4">Create your first business to start receiving orders.</p>
                      <button onClick={() => setShowCreate(true)} className="px-6 py-2.5 bg-primary text-bg font-medium text-sm rounded-lg cursor-pointer border-none">+ Create Business</button>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {businesses.map(biz => (
                        <div key={biz.id} className="bg-surface rounded-xl p-5 cursor-pointer hover:ring-1 hover:ring-primary/30 transition"
                          onClick={() => { setSelectedBiz(biz.id); setTab('orders'); }}>
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-base font-semibold m-0">{biz.business_name}</h3>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${biz.is_active ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
                              {biz.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-xs text-text2 m-0 mb-2">{biz.business_address}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {biz.tags?.map(tag => (
                              <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{tag}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ MY PRODUCTS ═══ */}
              {tab === 'products' && (
                <div>
                  <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold m-0">My Products</h2>
                      {businesses.length > 0 && (
                        <select value={selectedBiz || ''} onChange={e => setSelectedBiz(parseInt(e.target.value))}
                          className="px-3 py-2 bg-surface2 border border-border rounded-lg text-text text-sm focus:border-primary focus:outline-none">
                          {businesses.map(b => <option key={b.id} value={b.id}>{b.business_name}</option>)}
                        </select>
                      )}
                    </div>
                    <button onClick={() => { setEditProduct(null); setShowProductForm(true); }} disabled={!selectedBiz}
                      className="px-4 py-2 bg-primary text-bg font-medium text-sm rounded-lg cursor-pointer border-none hover:bg-primary-hover transition disabled:opacity-50">
                      + Add Product
                    </button>
                  </div>
                  {products.filter(p => !selectedBiz || p.business_id === selectedBiz).length === 0 ? (
                    <div className="bg-surface rounded-xl p-10 text-center">
                      <p className="text-4xl mb-3">📋</p>
                      <h3 className="text-lg font-semibold mb-1">No Products Yet</h3>
                      <p className="text-text2 text-sm">Add your first product to start selling.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {products.filter(p => !selectedBiz || p.business_id === selectedBiz).map(product => (
                        <div key={product.id} className="bg-surface rounded-xl p-3 relative group">
                          <div className="aspect-square bg-surface2 rounded-lg mb-3 overflow-hidden relative">
                            {product.image1_url ? (
                              <img src={`${UPLOADS_URL}${product.image1_url.replace(/^\/uploads/, '')}`} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-text2 text-xs">No Image</div>
                            )}
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-bg/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
                              <button onClick={() => { setEditProduct(product); setShowProductForm(true); }}
                                className="w-9 h-9 rounded-lg bg-surface border-none cursor-pointer text-text flex items-center justify-center hover:bg-surface2 transition" title="Edit">✏️</button>
                              <button onClick={() => handleDeleteProduct(product.id)}
                                className="w-9 h-9 rounded-lg bg-surface border-none cursor-pointer text-danger flex items-center justify-center hover:bg-danger/10 transition" title="Delete">🗑️</button>
                            </div>
                          </div>
                          <p className="text-sm font-medium m-0 truncate">{product.name}</p>
                          <p className="text-xs text-text2 m-0 mt-0.5">₹{product.price} / {product.unit}</p>
                          <p className="text-xs text-text2 m-0 mt-0.5">Stock: {product.stock_qty} · {product.is_available ? '✓' : '✗'}</p>
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

      {/* ═══ MODALS ═══ */}
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

      {/* FAB — Add Product */}
      {tab !== 'businesses' && !showCreate && !showProductForm && selectedBiz && (
        <button onClick={() => { setEditProduct(null); setShowProductForm(true); setTab('products'); }}
          className="fixed bottom-20 md:bottom-8 right-6 w-14 h-14 rounded-full bg-primary text-bg text-2xl font-bold border-none cursor-pointer shadow-lg hover:bg-primary-hover transition flex items-center justify-center z-40">
          +
        </button>
      )}
    </div>
  );
};

export default Dashboard;
