import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import CartDrawer from '../components/CartDrawer';
import MyOrders from '../components/MyOrders';
import AddressManager from '../components/AddressManager';
import StoreMap from '../components/StoreMap';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';
const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || `${API}/uploads`;
const CATEGORIES = ['All', 'General Store', 'Stationary', 'Bookstore', 'Medical', 'Grocery', 'Electronics', 'Other'];

const Market = () => {
  const navigate = useNavigate();
  const { items, addToCart, updateQuantity, totalItems } = useCart();
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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAddToCart = product => addToCart(product, 1);

  const getCartQty = productId => {
    const item = items.find(i => i.product.id === productId);
    return item ? item.quantity : 0;
  };



  return (
    <div className="min-h-screen bg-bg">
      <Navbar onCartOpen={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <main className="pt-20 pb-20 md:pb-8 px-4 md:px-8 max-w-6xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[{key:'store',label:'Browse Products'},{key:'orders',label:'My Orders'},{key:'account',label:'Account'}].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium border-none cursor-pointer transition
                ${tab === t.key ? 'bg-primary text-bg' : 'bg-surface text-text2 hover:bg-surface2'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'orders' && <MyOrders />}
        {tab === 'account' && <AddressManager />}

        {tab === 'store' && (
          <>
            {/* Category filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-6" style={{ scrollbarWidth: 'none' }}>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveTag(cat)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border-none cursor-pointer transition
                    ${activeTag === cat ? 'bg-primary text-bg' : 'bg-surface text-text hover:bg-surface2'}`}>
                  {cat}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-20 text-text2">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-3">🛍️</p>
                <h3 className="text-lg font-semibold mb-1">No Products Available</h3>
                <p className="text-text2 text-sm">Check back later for new listings!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {products.map(product => {
                  const inCart = getCartQty(product.id);
                  const outOfStock = product.stock_qty <= 0;
                  const atStockLimit = inCart >= product.stock_qty;
                  return (
                    <div key={product.id} className="bg-surface rounded-xl p-3 relative">
                      {/* Clickable area — navigates to product detail */}
                      <div className="cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                        <div className="aspect-square bg-surface2 rounded-lg mb-3 overflow-hidden relative">
                          {product.image1_url ? (
                            <img src={`${UPLOADS_URL}${product.image1_url.replace(/^\/uploads/, '')}`} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text2">
                              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                            </div>
                          )}
                          {outOfStock && (
                            <div className="absolute inset-0 bg-bg/70 flex items-center justify-center">
                              <span className="bg-surface2 text-text2 text-xs font-medium px-3 py-1.5 rounded-full">Out of Stock</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-medium text-text m-0 leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.name}</p>
                        <p className="text-xs text-text2 m-0 mt-1">{product.unit}</p>
                      </div>

                      {/* Price + Cart stepper — NOT inside clickable area */}
                      <div className="flex items-end justify-between mt-2">
                        <p className="text-base font-bold text-text m-0">₹{product.price}</p>
                        {!outOfStock && (
                          inCart > 0 ? (
                            <div className="flex items-center bg-primary rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                              <button onClick={() => updateQuantity(product.id, inCart - 1)}
                                className="w-7 h-7 border-none bg-primary text-bg cursor-pointer font-bold text-sm flex items-center justify-center hover:bg-primary-hover transition">−</button>
                              <span className="w-5 text-center text-xs font-bold text-bg">{inCart}</span>
                              <button
                                onClick={() => { if (!atStockLimit) updateQuantity(product.id, inCart + 1); }}
                                disabled={atStockLimit}
                                className={`w-7 h-7 border-none bg-primary text-bg font-bold text-sm flex items-center justify-center transition
                                  ${atStockLimit ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-primary-hover'}`}>+</button>
                            </div>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                              className="w-8 h-8 rounded-lg bg-primary text-bg border-none cursor-pointer font-bold text-lg flex items-center justify-center hover:bg-primary-hover transition">
                              +
                            </button>
                          )
                        )}
                      </div>

                      <p className="text-[11px] text-text2 mt-2 m-0">{product.business_name}</p>

                      {product.business_lat && product.business_lng && (
                        <div className="mt-2 rounded-lg overflow-hidden" style={{ height: '120px' }}>
                          <StoreMap lat={product.business_lat} lng={product.business_lng} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Market;
