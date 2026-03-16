import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import Navbar from '../components/Navbar';
import CartDrawer from '../components/CartDrawer';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';
const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || `${API}/uploads`;

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { items, addToCart, updateQuantity } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/api/products/${productId}`);
        setProduct(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [productId]);

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="animate-pulse text-text2">Loading product...</div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
      <p className="text-4xl">😕</p>
      <h2 className="text-lg font-semibold">Product not found</h2>
      <button onClick={() => navigate(-1)} className="px-5 py-2 rounded-lg bg-primary text-bg border-none cursor-pointer font-medium text-sm hover:bg-primary-hover transition">Go Back</button>
    </div>
  );

  const images = [product.image1_url, product.image2_url].filter(Boolean);
  const cartItem = items.find(i => i.product.id === product.id);
  const inCart = cartItem ? cartItem.quantity : 0;
  const outOfStock = product.stock_qty <= 0;
  const atStockLimit = inCart >= product.stock_qty;

  const imgUrl = (url) => `${UPLOADS_URL}${url.replace(/^\/uploads/, '')}`;

  return (
    <div className="min-h-screen bg-bg">
      <Navbar onCartOpen={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-20 left-4 z-30 w-10 h-10 rounded-full bg-surface/80 backdrop-blur border border-border text-text flex items-center justify-center cursor-pointer hover:bg-surface2 transition shadow-lg"
        aria-label="Go back"
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
      </button>

      <main className="pt-16 pb-32 max-w-2xl mx-auto">
        {/* Image Carousel / Single Image / Placeholder */}
        <div className="relative w-full aspect-square bg-surface2 overflow-hidden">
          {images.length > 0 ? (
            <>
              <img
                src={imgUrl(images[activeImg])}
                alt={product.name}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
              {images.length === 2 && (
                <>
                  {/* Dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        className={`w-2.5 h-2.5 rounded-full border-none cursor-pointer transition ${i === activeImg ? 'bg-primary scale-110' : 'bg-white/50'}`}
                        aria-label={`Image ${i + 1}`}
                      />
                    ))}
                  </div>
                  {/* Prev / Next arrows */}
                  <button onClick={() => setActiveImg(0)} className={`absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-surface/70 backdrop-blur border-none text-text cursor-pointer flex items-center justify-center transition hover:bg-surface ${activeImg === 0 ? 'opacity-0 pointer-events-none' : ''}`}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <button onClick={() => setActiveImg(1)} className={`absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-surface/70 backdrop-blur border-none text-text cursor-pointer flex items-center justify-center transition hover:bg-surface ${activeImg === 1 ? 'opacity-0 pointer-events-none' : ''}`}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-text2 gap-2">
              <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
              <span className="text-sm">No image available</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="px-4 pt-5">
          {/* Name + Stock Badge */}
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold text-text m-0 leading-tight flex-1">{product.name}</h1>
            {outOfStock ? (
              <span className="shrink-0 bg-red-500/10 text-red-400 text-xs font-medium px-3 py-1 rounded-full">Out of Stock</span>
            ) : product.stock_qty <= 5 ? (
              <span className="shrink-0 bg-yellow-500/10 text-yellow-400 text-xs font-medium px-3 py-1 rounded-full">Only {product.stock_qty} left</span>
            ) : (
              <span className="shrink-0 bg-green-500/10 text-green-400 text-xs font-medium px-3 py-1 rounded-full">In Stock</span>
            )}
          </div>

          {/* Price + Unit */}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-primary">₹{product.price}</span>
            <span className="text-sm text-text2">/ {product.unit}</span>
          </div>

          {/* Description */}
          {product.description && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-text2 uppercase tracking-wide mb-2 m-0">Description</h3>
              <p className="text-sm text-text leading-relaxed m-0">{product.description}</p>
            </div>
          )}

          {/* Seller Info */}
          <div className="mt-6 bg-surface rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text2 uppercase tracking-wide mb-3 m-0">Seller Information</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🏪</span>
                <span className="text-sm font-medium text-text">{product.business_name}</span>
              </div>
              {product.business_address && (
                <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5">📍</span>
                  <span className="text-sm text-text2 leading-relaxed">{product.business_address}</span>
                </div>
              )}
              {product.business_phone && (
                <div className="flex items-center gap-2">
                  <span className="text-base">📞</span>
                  <span className="text-sm text-text2">{product.business_phone}</span>
                </div>
              )}
              {product.tags && product.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {product.tags.map((tag, i) => (
                    <span key={i} className="px-2.5 py-1 bg-surface2 text-text2 text-xs rounded-full">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reviews placeholder */}
          <div id="reviews-section" className="mt-6 bg-surface rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text2 uppercase tracking-wide mb-2 m-0">Reviews</h3>
            <p className="text-sm text-text2 m-0">Reviews coming soon</p>
          </div>
        </div>
      </main>

      {/* Bottom sticky Add to Cart bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border px-4 py-3 max-w-2xl mx-auto">
        {outOfStock ? (
          <button disabled className="w-full py-3.5 rounded-xl bg-surface2 text-text2 font-semibold text-sm border-none cursor-not-allowed">
            Out of Stock
          </button>
        ) : inCart > 0 ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-primary rounded-xl overflow-hidden">
              <button
                onClick={() => updateQuantity(product.id, inCart - 1)}
                className="w-11 h-11 border-none bg-primary text-bg cursor-pointer font-bold text-lg flex items-center justify-center hover:bg-primary-hover transition"
              >−</button>
              <span className="w-8 text-center text-sm font-bold text-bg">{inCart}</span>
              <button
                onClick={() => { if (!atStockLimit) updateQuantity(product.id, inCart + 1); }}
                disabled={atStockLimit}
                className={`w-11 h-11 border-none bg-primary text-bg font-bold text-lg flex items-center justify-center transition ${atStockLimit ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-primary-hover'}`}
              >+</button>
            </div>
            <button
              onClick={() => navigate('/checkout')}
              className="flex-1 py-3.5 rounded-xl bg-primary text-bg font-semibold text-sm border-none cursor-pointer hover:bg-primary-hover transition"
            >
              Go to Checkout — ₹{(parseFloat(product.price) * inCart).toFixed(2)}
            </button>
          </div>
        ) : (
          <button
            onClick={() => addToCart(product, 1)}
            className="w-full py-3.5 rounded-xl bg-primary text-bg font-semibold text-sm border-none cursor-pointer hover:bg-primary-hover transition"
          >
            Add to Cart — ₹{product.price}
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
