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
      </div>
    </div>
  );
};

export default Login;
