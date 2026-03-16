import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';

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
  <div className="bg-surface rounded-xl p-4">
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

const SORT_OPTIONS = [
  { key: 'recent', label: 'Most Recent' },
  { key: 'highest', label: 'Highest Rated' },
  { key: 'lowest', label: 'Lowest Rated' },
];

const AllReviews = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [productName, setProductName] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    const load = async () => {
      try {
        const [revRes, prodRes] = await Promise.all([
          axios.get(`${API}/api/reviews/${productId}`),
          axios.get(`${API}/api/products/${productId}`)
        ]);
        setReviews(revRes.data.reviews);
        setAvgRating(revRes.data.average_rating);
        setTotalCount(revRes.data.total_count);
        setProductName(prodRes.data.name);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [productId]);

  const sorted = [...reviews].sort((a, b) => {
    if (sortBy === 'highest') return b.rating - a.rating;
    if (sortBy === 'lowest') return a.rating - b.rating;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="animate-pulse text-text2">Loading reviews...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      {/* Back button */}
      <button onClick={() => navigate(-1)}
        className="fixed top-20 left-4 z-30 w-10 h-10 rounded-full bg-surface/80 backdrop-blur border border-border text-text flex items-center justify-center cursor-pointer hover:bg-surface2 transition shadow-lg"
        aria-label="Go back">
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
      </button>

      <main className="pt-20 pb-8 px-4 max-w-2xl mx-auto">
        {/* Title */}
        <h1 className="text-lg font-bold text-text m-0 mb-1">{productName}</h1>
        <p className="text-sm text-text2 m-0 mb-5">All Reviews</p>

        {/* Summary bar */}
        {totalCount > 0 && (
          <div className="flex items-center gap-3 bg-surface rounded-xl p-4 mb-5">
            <span className="text-3xl font-bold text-text">{avgRating}</span>
            <div>
              <Stars rating={Math.round(avgRating)} size={16} />
              <p className="text-xs text-text2 m-0 mt-1">{totalCount} review{totalCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )}

        {/* Sort dropdown */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-text2">{totalCount} review{totalCount !== 1 ? 's' : ''}</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:border-primary focus:outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Reviews list */}
        <div className="flex flex-col gap-3">
          {sorted.map(r => <ReviewCard key={r.id} review={r} />)}
        </div>

        {totalCount === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-text2">No reviews yet</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AllReviews;
