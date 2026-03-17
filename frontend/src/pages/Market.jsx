import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import CartDrawer from '../components/CartDrawer';
import MyOrders from '../components/MyOrders';
import AddressManager from '../components/AddressManager';


const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';
const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || `${API}/uploads`;
const CATEGORIES = ['All', 'General Store', 'Stationary', 'Bookstore', 'Medical', 'Grocery', 'Electronics', 'Other'];

const Market = () => {
  const navigate = useNavigate();
  const { items, addToCart, updateQuantity, totalItems, pruneUnavailable } = useCart();
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('store');
  const [activeTag, setActiveTag] = useState('All');
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    fetchProducts();
  }, [navigate]);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API}/api/products/store`);
      setProducts(res.data);
      const availableIds = new Set(res.data.map(p => p.id));
      pruneUnavailable(availableIds);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAddToCart = product => addToCart(product, 1);

  const getCartQty = productId => {
    const item = items.find(i => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  return (
    <div className="min-h-screen">
      <Navbar onCartOpen={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <main className="pt-20 pb-28 md:pb-8 px-4 md:px-8 max-w-6xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[{key:'store',label:'Browse Products'},{key:'orders',label:'My Orders'},{key:'account',label:'Account'}].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`glass-pill px-4 py-2 text-sm font-semibold cursor-pointer transition
                ${tab === t.key ? 'text-white' : 'text-white/50 hover:bg-white/8'}`}
              style={tab === t.key ? { background: 'rgba(248,194,0,0.15)', borderColor: 'rgba(248,194,0,0.6)', boxShadow: '0 0 12px rgba(248,194,0,0.25)' } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'orders' && <MyOrders />}
        {tab === 'account' && <AddressManager />}

        {tab === 'store' && (
          <>
            {/* Category filter pills */}
            <div className="flex gap-2 overflow-x-auto mb-6" style={{ scrollbarWidth: 'none', padding: '8px 4px 12px 4px', margin: '-8px -4px 24px -4px' }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveTag(cat)}
                  className={`glass-pill shrink-0 px-4 py-2 text-sm font-medium cursor-pointer transition
                    ${activeTag === cat ? 'text-primary font-semibold' : 'text-white/70 hover:bg-white/8'}`}
                  style={activeTag === cat ? { background: 'rgba(248,194,0,0.12)', borderColor: 'rgba(248,194,0,0.5)', boxShadow: '0 0 14px rgba(248,194,0,0.2)' } : {}}>
                  {cat}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-20 text-white/40">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-3">🛍️</p>
                <h3 className="text-lg font-semibold mb-1 text-white">No Products Available</h3>
                <p className="text-white/40 text-sm">Check back later for new listings!</p>
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
              >
                {products.map(product => {
                  const inCart = getCartQty(product.id);
                  const outOfStock = product.stock_qty <= 0;
                  const atStockLimit = inCart >= product.stock_qty;
                  return (
                    <motion.div
                      key={product.id}
                      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                      className="glass-card glass-card-hover overflow-hidden relative"
                    >
                      <div className="cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                        <div className="w-full overflow-hidden relative" style={{ height: 180 }}>
                          {product.image1_url ? (
                            <img src={`${UPLOADS_URL}${product.image1_url.replace(/^\/uploads/, '')}`} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                              <svg width="32" height="32" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                            </div>
                          )}
                          {outOfStock && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                              <span className="glass-pill text-white/70 text-xs font-medium px-3 py-1.5">Out of Stock</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-semibold text-white m-0 leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.name}</p>
                          <p className="text-xs text-white/40 m-0 mt-1">{product.unit}</p>
                        </div>
                      </div>

                      <div className="flex items-end justify-between px-3 pb-3">
                        <p className="text-base font-bold text-primary m-0">₹{product.price}</p>
                        {!outOfStock && (
                          inCart > 0 ? (
                            <div className="flex items-center glass-pill overflow-hidden" onClick={e => e.stopPropagation()}>
                              <button onClick={() => updateQuantity(product.id, inCart - 1)}
                                className="w-7 h-7 border-none bg-transparent text-primary cursor-pointer font-bold text-sm flex items-center justify-center hover:bg-white/10 transition">−</button>
                              <span className="w-5 text-center text-xs font-bold text-white">{inCart}</span>
                              <button
                                onClick={() => { if (!atStockLimit) updateQuantity(product.id, inCart + 1); }}
                                disabled={atStockLimit}
                                className={`w-7 h-7 border-none bg-transparent text-primary font-bold text-sm flex items-center justify-center transition
                                  ${atStockLimit ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10'}`}>+</button>
                            </div>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                              className="w-8 h-8 rounded-full bg-primary text-black border-none cursor-pointer font-bold text-lg flex items-center justify-center hover:glow-yellow transition">
                              +
                            </button>
                          )
                        )}
                      </div>

                      <p className="text-[11px] text-white/30 px-3 pb-3 m-0">{product.business_name}</p>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Market;
