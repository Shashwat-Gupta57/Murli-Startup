import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Navbar = ({ onCartOpen }) => {
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropRef = useRef(null);
  const role = localStorage.getItem('role');
  const userName = 'Account';

  useEffect(() => {
    const handler = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-bg border-b border-surface2 z-50 flex items-center px-4 md:px-8">
      {/* Left: brand */}
      <Link to={role === 'retailer' ? '/dashboard' : '/market'} className="text-primary font-bold text-xl tracking-tight no-underline">
        Murli
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: cart + account */}
      <div className="flex items-center gap-3">
        {role !== 'retailer' && (
          <button onClick={onCartOpen} className="relative flex items-center gap-1.5 bg-surface hover:bg-surface2 text-text px-3 py-2 rounded-lg transition cursor-pointer border-none text-sm font-medium">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/></svg>
            Cart
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-bg text-[11px] font-bold flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        )}

        <div className="relative" ref={dropRef}>
          <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-1.5 bg-surface hover:bg-surface2 text-text px-3 py-2 rounded-lg transition cursor-pointer border-none text-sm">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span className="hidden md:inline">{userName}</span>
          </button>
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50">
              {role !== 'retailer' && (
                <Link to="/market" onClick={() => { setShowDropdown(false); }}
                  className="block px-4 py-2.5 text-sm text-text hover:bg-surface2 no-underline transition">
                  My Orders
                </Link>
              )}
              {role === 'retailer' && (
                <Link to="/dashboard" onClick={() => { setShowDropdown(false); }}
                  className="block px-4 py-2.5 text-sm text-text hover:bg-surface2 no-underline transition">
                  Dashboard
                </Link>
              )}
              <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-surface2 border-none bg-transparent cursor-pointer transition">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
