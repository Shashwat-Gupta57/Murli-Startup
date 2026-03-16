import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
      <svg key={i} width={size} height={size} viewBox="0 0 20 20" fill={i <= rating ? '#FACC15' : '#374151'}>
        <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.27l-4.77 2.51.91-5.33L2.27 6.68l5.34-.78L10 1z"/>
      </svg>
    ))}
  </span>
);

const ReviewCard = ({ review }) => (
  <div className="bg-surface2 rounded-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
          {review.customer_name?.[0]?.toUpperCase() || '?'}
        </div>
        <span className="text-sm font-medium text-text">{review.customer_name || 'Anonymous'}</span>
      </div>
      <span className="text-xs text-text2">{new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
    </div>
    <Stars rating={review.rating} size={14} />
    {review.review_text && <p className="text-sm text-text mt-2 m-0 leading-relaxed">{review.review_text}</p>}
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

  // Reviews state
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

  // Check if customer can review (has a delivered order with this product and hasn't reviewed yet)
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
    // Decode token to get user id and check if already reviewed
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.user?.id;
      if (userId && reviews.length > 0) {
        // We don't have customer_id in the review, so we check by customer_name matching
        // Better: just check via the POST endpoint; for now, track based on reviews count refresh
      }
    } catch {}
    // Simple check: after fetching reviews, see if our user has reviewed
    const checkReviewed = async () => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.user?.id;
        // We'll check if there's a review by this user — use a test POST that would return 400
        // Actually, let's just store the user id and compare in the reviews list
        // The reviews don't have customer_id, but they have customer_name.
        // Best approach: just try to POST and handle the 400 if already reviewed.
        setHasReviewed(false); // Will be set to true if we get error on submit
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
  const showInline = reviews.slice(0, 4);

  return (
    <div className="min-h-screen bg-bg">
      <Navbar onCartOpen={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Back button */}
      <button onClick={() => navigate(-1)}
        className="fixed top-20 left-4 z-30 w-10 h-10 rounded-full bg-surface/80 backdrop-blur border border-border text-text flex items-center justify-center cursor-pointer hover:bg-surface2 transition shadow-lg"
        aria-label="Go back">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
      </button>

      <main className="pt-16 pb-32 max-w-2xl mx-auto">
        {/* Image Carousel */}
        <div className="relative w-full aspect-square bg-surface2 overflow-hidden">
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

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-primary">₹{product.price}</span>
            <span className="text-sm text-text2">/ {product.unit}</span>
          </div>

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

          {/* ═══ Reviews Section ═══ */}
          <div id="reviews-section" className="mt-6 bg-surface rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text2 uppercase tracking-wide m-0">Reviews</h3>
              {totalCount > 0 && (
                <div className="flex items-center gap-2">
                  <Stars rating={Math.round(avgRating)} size={14} />
                  <span className="text-sm font-bold text-text">{avgRating}</span>
                  <span className="text-xs text-text2">({totalCount})</span>
                </div>
              )}
            </div>

            {totalCount === 0 ? (
              <p className="text-sm text-text2 m-0">No reviews yet. Be the first to review!</p>
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
              <div className="mt-5 pt-4 border-t border-border">
                <h4 className="text-sm font-semibold text-text mb-3 m-0">Write a Review</h4>
                {/* Star selector */}
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(i => (
                    <button key={i} onClick={() => setNewRating(i)}
                      className="bg-transparent border-none cursor-pointer p-0.5 transition hover:scale-110">
                      <svg width="28" height="28" viewBox="0 0 20 20" fill={i <= newRating ? '#FACC15' : '#374151'}>
                        <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.27l-4.77 2.51.91-5.33L2.27 6.68l5.34-.78L10 1z"/>
                      </svg>
                    </button>
                  ))}
                  {newRating > 0 && <span className="text-xs text-text2 ml-2">{newRating}/5</span>}
                </div>
                <textarea
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  placeholder="Share your experience (optional)"
                  rows={3}
                  className="w-full px-3 py-2.5 bg-surface2 border border-border rounded-lg text-text text-sm resize-none focus:border-primary focus:outline-none transition placeholder:text-text2"
                />
                <button
                  onClick={handleSubmitReview}
                  disabled={submitting || newRating === 0}
                  className={`mt-3 px-5 py-2.5 rounded-lg font-medium text-sm border-none transition ${
                    submitting || newRating === 0
                      ? 'bg-surface2 text-text2 cursor-not-allowed'
                      : 'bg-primary text-bg cursor-pointer hover:bg-primary-hover'
                  }`}
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            )}
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
              <button onClick={() => updateQuantity(product.id, inCart - 1)}
                className="w-11 h-11 border-none bg-primary text-bg cursor-pointer font-bold text-lg flex items-center justify-center hover:bg-primary-hover transition">−</button>
              <span className="w-8 text-center text-sm font-bold text-bg">{inCart}</span>
              <button onClick={() => { if (!atStockLimit) updateQuantity(product.id, inCart + 1); }}
                disabled={atStockLimit}
                className={`w-11 h-11 border-none bg-primary text-bg font-bold text-lg flex items-center justify-center transition ${atStockLimit ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-primary-hover'}`}>+</button>
            </div>
            <button onClick={() => navigate('/checkout')}
              className="flex-1 py-3.5 rounded-xl bg-primary text-bg font-semibold text-sm border-none cursor-pointer hover:bg-primary-hover transition">
              Go to Checkout — ₹{(parseFloat(product.price) * inCart).toFixed(2)}
            </button>
          </div>
        ) : (
          <button onClick={() => addToCart(product, 1)}
            className="w-full py-3.5 rounded-xl bg-primary text-bg font-semibold text-sm border-none cursor-pointer hover:bg-primary-hover transition">
            Add to Cart — ₹{product.price}
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;

