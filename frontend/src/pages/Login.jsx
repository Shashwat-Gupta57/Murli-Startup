import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
      // Clear stale data from any previous user
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      localStorage.removeItem('cartData');
      localStorage.removeItem('selectedDeliveryAddress');
      localStorage.removeItem('selectedCity');
      // Save new auth data
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
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface rounded-xl p-8 shadow-xl">
        <h2 className="text-center text-2xl font-bold mb-1">
          <span className="text-primary">Murli</span>
        </h2>
        <p className="text-center text-text2 text-sm mb-8">Sign in to your account</p>

        {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm px-4 py-2.5 rounded-lg mb-5">{error}</div>}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email Address" required
            className="w-full px-4 py-3 bg-surface2 border border-border rounded-lg text-text text-sm focus:border-primary focus:outline-none transition placeholder:text-text2"
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" required
            className="w-full px-4 py-3 bg-surface2 border border-border rounded-lg text-text text-sm focus:border-primary focus:outline-none transition placeholder:text-text2"
          />
          <button type="submit" className="w-full py-3 bg-primary text-bg font-semibold text-sm rounded-lg cursor-pointer border-none hover:bg-primary-hover transition mt-2">
            Sign In
          </button>
        </form>

        <p className="text-center text-text2 text-sm mt-6">
          Don't have an account? <Link to="/register" className="text-primary font-medium no-underline hover:underline">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
