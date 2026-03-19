import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/login`, { email, password });
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      localStorage.removeItem('cartData');
      localStorage.removeItem('selectedDeliveryAddress');
      localStorage.removeItem('selectedCity');
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('authToken', res.data.token);
      localStorage.setItem('role', res.data.user.role);
      localStorage.setItem('authUser', JSON.stringify(res.data.user));
      navigate(res.data.user.role === 'retailer' ? '/dashboard' : '/market');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Local auth blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          style={{ position: 'absolute', borderRadius: '50%', width: 500, height: 500, left: '-10%', top: '-10%', background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)', filter: 'blur(100px)', opacity: 0.3 }}
          animate={{ scale: [1, 1.2, 1], x: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          style={{ position: 'absolute', borderRadius: '50%', width: 400, height: 400, right: '-5%', bottom: '10%', background: 'radial-gradient(circle, #0891B2 0%, transparent 70%)', filter: 'blur(100px)', opacity: 0.25 }}
          animate={{ scale: [1, 1.3, 1], y: [0, -40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          style={{ position: 'absolute', borderRadius: '50%', width: 350, height: 350, left: '50%', bottom: '-10%', background: 'radial-gradient(circle, #4F46E5 0%, transparent 70%)', filter: 'blur(90px)', opacity: 0.2 }}
          animate={{ x: [-50, 50, -50], scale: [1, 1.1, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Glass strips overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex">
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.div
            key={i}
            className="flex-1 h-full"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 100%)',
              mixBlendMode: 'overlay',
              borderRight: '1px solid rgba(255,255,255,0.02)',
            }}
            animate={{ opacity: [0.4 + (i % 3) * 0.1, 0.7, 0.4 + (i % 3) * 0.1] }}
            transition={{ duration: 4 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Brand + tagline */}
        <div className="text-center mb-8">
          <h1 className="gradient-brand text-5xl font-extrabold mb-2 m-0">Murli</h1>
          <p className="text-white/50 text-sm m-0">Your neighbourhood, delivered.</p>
        </div>

        {/* Glass card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass-card glow-purple p-10"
        >
          <h2 className="text-xl font-bold mb-1 m-0 text-center text-white">Welcome back</h2>
          <p className="text-center text-white/40 text-sm mb-8 m-0">Sign in to continue</p>

          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2.5 rounded-xl mb-5">{error}</div>}

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email Address" required
              className="glass-input w-full px-4 py-3.5 text-sm"
            />
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password" required
              className="glass-input w-full px-4 py-3.5 text-sm"
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 bg-primary text-black font-bold text-sm rounded-full cursor-pointer border-none hover:glow-yellow transition mt-2"
              style={{ boxShadow: '0 0 20px rgba(248,194,0,0.3)' }}
            >
              Sign In
            </motion.button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6 m-0">
            Don't have an account? <Link to="/register" className="text-primary font-medium no-underline hover:underline">Sign Up</Link>
          </p>
        </motion.div>

        {/* ─── Delivery Partner Section ─── */}
        <DeliveryPartnerEntry />
      </div>
    </div>
  );
};

/* Delivery Partner Entry — below main login form */
const DeliveryPartnerEntry = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (code.length < 5) { setError('Enter a valid 5-character code'); return; }
    setLoading(true);
    setError('');
    try {
      const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
      const res = await axios.post(`${apiBase}/api/delivery/login`, {
        delivery_code: code
      });
      localStorage.setItem('deliverySession', JSON.stringify({
        delivery_code: res.data.delivery_code,
        business_id: res.data.business_id,
        business_name: res.data.business_name,
      }));
      navigate('/delivery');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid delivery code');
    }
    finally { setLoading(false); }
  };

  return (
    <div className="relative z-10 w-full max-w-[440px] mx-auto mt-6">
      {/* Divider */}
      <div style={{ height: 3, background: '#F8C200', borderRadius: 2, margin: '0 0 20px 0' }} />

      {/* Toggle button */}
      <button onClick={() => setOpen(!open)}
        style={{
          width: '100%', height: 56, background: '#1C1C1C', border: '2px solid #F8C200',
          borderRadius: 12, color: '#F8C200', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
        🚚 I AM A DELIVERY PARTNER
      </button>

      {open && (
        <div style={{ marginTop: 16, background: '#1C1C1C', borderRadius: 16, padding: 24, border: '1px solid #2A2A2A' }}>
          <p style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', margin: '0 0 16px 0', textAlign: 'center' }}>
            Enter Your Delivery Code
          </p>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().slice(0, 5))}
            maxLength={5}
            placeholder="e.g. 7829K"
            style={{
              width: '100%', height: 52, background: '#2A2A2A', border: '2px solid #3A3A3A',
              borderRadius: 12, color: '#F8C200', fontSize: 24, fontWeight: 'bold', textAlign: 'center',
              letterSpacing: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace',
            }}
            onFocus={e => e.target.style.borderColor = '#F8C200'}
            onBlur={e => e.target.style.borderColor = '#3A3A3A'}
          />
          {error && <p style={{ color: '#DC2626', fontSize: 18, fontWeight: 'bold', textAlign: 'center', margin: '12px 0 0 0' }}>{error}</p>}
          <button onClick={handleSubmit} disabled={loading || code.length < 5}
            style={{
              width: '100%', height: 56, background: '#F8C200', color: '#000', border: 'none',
              borderRadius: 12, fontSize: 18, fontWeight: 'bold', cursor: 'pointer', marginTop: 16,
              opacity: (loading || code.length < 5) ? 0.5 : 1,
            }}>
            {loading ? 'CONNECTING...' : 'OPEN DELIVERY APP'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Login;
