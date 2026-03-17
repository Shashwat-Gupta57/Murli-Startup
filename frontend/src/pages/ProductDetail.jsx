import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import CartDrawer from '../components/CartDrawer';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';
const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || `${API}/uploads`;

const Stars = ({ rating, size = 16 }) => (
  <span className="inline-flex gap-0.5">
    {[1,2,3,4,5].map(i => (
      <svg key={i} width={size} height={size} viewBox="0 0 20 20" fill={i <= rating ? '#F8C200' : 'rgba(255,255,255,0.15)'}>
        <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.27l-4.77 2.51.91-5.33L2.27 6.68l5.34-.78L10 1z"/>
      </svg>
    ))}
  </span>
);

const ReviewCard = ({ review }) => (
  <div className="glass-card p-4">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
          {review.customer_name?.[0]?.toUpperCase() || '?'}
        </div>
        <span className="text-sm font-medium text-white">{review.customer_name || 'Anonymous'}</span>
      </div>
      <span className="text-xs text-white/40">{new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
    </div>
    <Stars rating={review.rating} size={14} />
    {review.review_text && <p className="text-sm text-white/80 mt-2 m-0 leading-relaxed">{review.review_text}</p>}
  </div>
);

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { items, addToCart, updateQuantity } = useCart();
  const { showToast } = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newText, setNewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const fetchReviews = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/reviews/${productId}`);
      setReviews(res.data.reviews);
      setAvgRating(res.data.average_rating);
      setTotalCount(res.data.total_count);
    } catch (err) { console.error(err); }
  }, [productId]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/api/products/${productId}`);
        setProduct(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
    fetchReviews();
  }, [productId, fetchReviews]);

  useEffect(() => {
    if (role !== 'customer' || !token) return;
    const check = async () => {
      try {
        const ordersRes = await axios.get(`${API}/api/orders/my`, { headers: { Authorization: `Bearer ${token}` } });
        const delivered = ordersRes.data.filter(o => o.status === 'delivered');
        const hasProduct = delivered.some(o => o.items?.some(i => i.product_id === parseInt(productId)));
        setCanReview(hasProduct);
      } catch (err) { console.error(err); }
    };
    check();
  }, [productId, token, role]);

  useEffect(() => {
    if (!token || role !== 'customer') return;
    const checkReviewed = async () => {
      try {
        setHasReviewed(false);
      } catch {}
    };
    checkReviewed();
  }, [token, role, reviews]);

  const handleSubmitReview = async () => {
    if (newRating === 0) { showToast('Please select a rating', 'error'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/reviews`, {
        product_id: parseInt(productId),
        rating: newRating,
        review_text: newText || null
      }, { headers: { Authorization: `Bearer ${token}` } });
      showToast('Review submitted!', 'success');
      setNewRating(0);
      setNewText('');
      setHasReviewed(true);
      setCanReview(false);
      fetchReviews();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit review';
      if (msg === 'You have already reviewed this product') setHasReviewed(true);
      showToast(msg, 'error');
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-white/40">Loading product...</div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-4xl">😕</p>
      <h2 className="text-lg font-semibold text-white">Product not found</h2>
      <motion.button onClick={() => navigate(-1)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        className="px-5 py-2 rounded-full bg-primary text-black border-none cursor-pointer font-medium text-sm transition"
        style={{ boxShadow: '0 0 20px rgba(248,194,0,0.3)' }}>Go Back</motion.button>
    </div>
  );

  const images = [product.image1_url, product.image2_url].filter(Boolean);
  const cartItem = items.find(i => i.product.id === product.id);
  const inCart = cartItem ? cartItem.quantity : 0;
  const outOfStock = product.stock_qty <= 0;
  const atStockLimit = inCart >= product.stock_qty;
  const imgUrl = (url) => `${UPLOADS_URL}${url.replace(/^\/uploads/, '')}`;
  const showInline = reviews.slice(0, 4);

  return (
    <div className="min-h-screen">
      <Navbar onCartOpen={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Back button */}
      <button onClick={() => navigate(-1)}
        className="glass-pill fixed top-20 left-4 z-30 w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition"
        aria-label="Go back">
        <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
      </button>

      <main className="pt-16 pb-32 max-w-2xl mx-auto">
        {/* Image Carousel */}
        <div className="glass-card relative w-full aspect-square overflow-hidden mx-4" style={{ borderRadius: 20 }}>
          {images.length > 0 ? (
            <>
              <img src={imgUrl(images[activeImg])} alt={product.name} className="w-full h-full object-cover transition-opacity duration-300" />
              {images.length === 2 && (
                <>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, i) => (
                      <button key={i} onClick={() => setActiveImg(i)}
                        className={`w-2.5 h-2.5 rounded-full border-none cursor-pointer transition ${i === activeImg ? 'bg-primary scale-110' : 'bg-white/50'}`} />
                    ))}
                  </div>
                  <button onClick={() => setActiveImg(0)} className={`glass-pill absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center cursor-pointer transition hover:bg-white/15 ${activeImg === 0 ? 'opacity-0 pointer-events-none' : ''}`}>
                    <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <button onClick={() => setActiveImg(1)} className={`glass-pill absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center cursor-pointer transition hover:bg-white/15 ${activeImg === 1 ? 'opacity-0 pointer-events-none' : ''}`}>
                    <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/30 gap-2">
              <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
              <span className="text-sm">No image available</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="px-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold text-white m-0 leading-tight flex-1">{product.name}</h1>
            {outOfStock ? (
              <span className="shrink-0 glass-pill bg-red-500/10 text-red-400 text-xs font-medium px-3 py-1">Out of Stock</span>
            ) : product.stock_qty <= 5 ? (
              <span className="shrink-0 glass-pill bg-yellow-500/10 text-yellow-400 text-xs font-medium px-3 py-1">Only {product.stock_qty} left</span>
            ) : (
              <span className="shrink-0 glass-pill bg-green-500/10 text-green-400 text-xs font-medium px-3 py-1">In Stock</span>
            )}
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-primary">₹{product.price}</span>
            <span className="text-sm text-white/40">/ {product.unit}</span>
          </div>

          {product.description && (
            <div className="glass-card mt-6 p-5">
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-2 m-0">Description</h3>
              <p className="text-sm text-white/80 leading-relaxed m-0">{product.description}</p>
            </div>
          )}

          {/* Seller Info */}
          <div className="glass-card mt-4 p-5">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-3 m-0">Seller Information</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🏪</span>
                <span className="text-sm font-medium text-white">{product.business_name}</span>
              </div>
              {product.business_address && (
                <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5">📍</span>
                  <span className="text-sm text-white/50 leading-relaxed">{product.business_address}</span>
                </div>
              )}
              {product.business_phone && (
                <div className="flex items-center gap-2">
                  <span className="text-base">📞</span>
                  <span className="text-sm text-white/50">{product.business_phone}</span>
                </div>
              )}
              {product.tags && product.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {product.tags.map((tag, i) => (
                    <span key={i} className="glass-pill px-2.5 py-1 text-white/50 text-xs">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reviews Section */}
          <div id="reviews-section" className="glass-card mt-4 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wide m-0">Reviews</h3>
              {totalCount > 0 && (
                <div className="flex items-center gap-2">
                  <Stars rating={Math.round(avgRating)} size={14} />
                  <span className="text-sm font-bold text-white">{avgRating}</span>
                  <span className="text-xs text-white/40">({totalCount})</span>
                </div>
              )}
            </div>

            {totalCount === 0 ? (
              <p className="text-sm text-white/40 m-0">No reviews yet. Be the first to review!</p>
            ) : (
              <div className="flex flex-col gap-3">
                {showInline.map(r => <ReviewCard key={r.id} review={r} />)}
                {totalCount > 4 && (
                  <button
                    onClick={() => navigate(`/product/${productId}/reviews`)}
                    className="text-sm font-medium text-primary bg-transparent border-none cursor-pointer hover:underline p-0 mt-1 text-left"
                  >
                    View all {totalCount} reviews →
                  </button>
                )}
              </div>
            )}

            {/* Write a review form */}
            {role === 'customer' && canReview && !hasReviewed && (
              <div className="mt-5 pt-4 border-t border-white/8">
                <h4 className="text-sm font-semibold text-white mb-3 m-0">Write a Review</h4>
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(i => (
                    <button key={i} onClick={() => setNewRating(i)}
                      className="bg-transparent border-none cursor-pointer p-0.5 transition hover:scale-110">
                      <svg width="28" height="28" viewBox="0 0 20 20" fill={i <= newRating ? '#F8C200' : 'rgba(255,255,255,0.15)'}>
                        <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.27l-4.77 2.51.91-5.33L2.27 6.68l5.34-.78L10 1z"/>
                      </svg>
                    </button>
                  ))}
                  {newRating > 0 && <span className="text-xs text-white/40 ml-2">{newRating}/5</span>}
                </div>
                <textarea
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  placeholder="Share your experience (optional)"
                  rows={3}
                  className="glass-input w-full px-3 py-2.5 text-sm resize-none"
                />
                <motion.button
                  onClick={handleSubmitReview}
                  disabled={submitting || newRating === 0}
                  whileHover={!(submitting || newRating === 0) ? { scale: 1.02 } : {}}
                  whileTap={!(submitting || newRating === 0) ? { scale: 0.98 } : {}}
                  className={`mt-3 px-5 py-2.5 rounded-full font-medium text-sm border-none transition ${
                    submitting || newRating === 0
                      ? 'bg-white/5 text-white/30 cursor-not-allowed'
                      : 'bg-primary text-black cursor-pointer'
                  }`}
                  style={!(submitting || newRating === 0) ? { boxShadow: '0 0 20px rgba(248,194,0,0.3)' } : {}}
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom sticky Add to Cart bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-3 max-w-2xl mx-auto">
        <div className="glass-card p-3" style={{ borderRadius: 16 }}>
          {outOfStock ? (
            <button disabled className="w-full py-3.5 rounded-full bg-white/5 text-white/30 font-semibold text-sm border-none cursor-not-allowed">
              Out of Stock
            </button>
          ) : inCart > 0 ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center glass-pill overflow-hidden">
                <button onClick={() => updateQuantity(product.id, inCart - 1)}
                  className="w-11 h-11 border-none bg-transparent text-primary cursor-pointer font-bold text-lg flex items-center justify-center hover:bg-white/10 transition">−</button>
                <span className="w-8 text-center text-sm font-bold text-white">{inCart}</span>
                <button onClick={() => { if (!atStockLimit) updateQuantity(product.id, inCart + 1); }}
                  disabled={atStockLimit}
                  className={`w-11 h-11 border-none bg-transparent text-primary font-bold text-lg flex items-center justify-center transition ${atStockLimit ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10'}`}>+</button>
              </div>
              <motion.button onClick={() => navigate('/checkout')}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 py-3.5 rounded-full bg-primary text-black font-bold text-sm border-none cursor-pointer transition"
                style={{ boxShadow: '0 0 20px rgba(248,194,0,0.3)' }}>
                Go to Checkout — ₹{(parseFloat(product.price) * inCart).toFixed(2)}
              </motion.button>
            </div>
          ) : (
            <motion.button onClick={() => addToCart(product, 1)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-full bg-primary text-black font-bold text-sm border-none cursor-pointer transition"
              style={{ boxShadow: '0 0 20px rgba(248,194,0,0.3)' }}>
              Add to Cart — ₹{product.price}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
