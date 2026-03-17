import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { motion } from 'framer-motion';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';
const labelIcon = { home: '🏠', work: '🏢', other: '📍' };

const Navbar = ({ onCartOpen }) => {
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const dropRef = useRef(null);
  const locRef = useRef(null);
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');

  const [selectedAddr, setSelectedAddr] = useState(() => {
    try { return JSON.parse(localStorage.getItem('selectedDeliveryAddress')) || null; } catch { return null; }
  });
  const [addresses, setAddresses] = useState([]);
  const [loadingLoc, setLoadingLoc] = useState(false);

  useEffect(() => {
    if (!selectedAddr && token && role === 'customer') {
      axios.get(`${API}/api/addresses`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          const def = res.data.find(a => a.is_default) || res.data[0];
          if (def) {
            const addr = { label: def.label === 'other' ? (def.custom_label || 'Other') : def.label, address_text: def.address_text, lat: def.lat, lng: def.lng };
            setSelectedAddr(addr);
            localStorage.setItem('selectedDeliveryAddress', JSON.stringify(addr));
          }
        }).catch(() => {});
    }
    localStorage.removeItem('selectedCity');
  }, []);

  useEffect(() => {
    if (showLocationModal && token) {
      axios.get(`${API}/api/addresses`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setAddresses(res.data))
        .catch(() => {});
    }
  }, [showLocationModal]);

  useEffect(() => {
    const handler = e => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDropdown(false);
      if (locRef.current && !locRef.current.contains(e.target)) setShowLocationModal(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('role');
    localStorage.removeItem('cartData');
    localStorage.removeItem('selectedDeliveryAddress');
    localStorage.removeItem('selectedCity');
    navigate('/login');
  };

  const selectAddress = (addr) => {
    setSelectedAddr(addr);
    localStorage.setItem('selectedDeliveryAddress', JSON.stringify(addr));
    setShowLocationModal(false);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    setLoadingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await axios.get(`${API}/api/geocode/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          selectAddress({ label: 'Current Location', address_text: res.data.address || 'Current Location', lat: pos.coords.latitude, lng: pos.coords.longitude });
        } catch { alert('Could not detect location'); }
        finally { setLoadingLoc(false); }
      },
      () => { alert('Location permission denied'); setLoadingLoc(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const displayLabel = selectedAddr?.label
    ? selectedAddr.label.charAt(0).toUpperCase() + selectedAddr.label.slice(1)
    : 'Select location';

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 h-16 glass-nav z-50 flex items-center px-4 md:px-8"
    >
      {/* Brand */}
      <Link to={role === 'retailer' ? '/dashboard' : '/market'} className="gradient-brand font-extrabold text-xl tracking-tight no-underline shrink-0">
        Murli
      </Link>

      {/* Address selector */}
      {role !== 'retailer' && (
        <div className="relative ml-3" ref={locRef}>
          <button
            onClick={() => setShowLocationModal(!showLocationModal)}
            className="glass-pill flex items-center gap-1.5 cursor-pointer text-left py-1.5 px-3 hover:border-white/20 transition max-w-[180px] md:max-w-[240px]"
          >
            <svg width="14" height="14" fill="none" stroke="#F8C200" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="text-xs text-white/70 truncate">{displayLabel}</span>
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-white/40 shrink-0">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {showLocationModal && (
            <div className="absolute left-0 top-full mt-2 w-72 overflow-hidden z-[1000]" style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
              <div className="px-4 py-3 border-b border-white/8">
                <h4 className="text-sm font-semibold m-0 text-white">Choose delivery address</h4>
              </div>

              <button
                onClick={handleUseCurrentLocation}
                disabled={loadingLoc}
                className="w-full flex items-center gap-3 px-4 py-3 text-left bg-transparent border-none cursor-pointer transition text-sm"
                style={{ ':hover': {} }}
                onMouseEnter={e => e.currentTarget.style.background = '#2A2A2A'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <svg width="16" height="16" fill="none" stroke="#F8C200" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 2v2m0 16v2M2 12h2m16 0h2M12 8a4 4 0 100 8 4 4 0 000-8z"/>
                  </svg>
                </span>
                <span className="text-primary font-medium">{loadingLoc ? 'Detecting...' : 'Use current location'}</span>
              </button>

              {addresses.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-white/3">
                    <span className="text-[11px] text-white/40 uppercase tracking-wide font-medium">Saved Addresses</span>
                  </div>
                  {addresses.map(addr => {
                    const addrLabel = addr.label === 'other' ? (addr.custom_label || 'Other') : addr.label;
                    return (
                      <button
                        key={addr.id}
                        onClick={() => selectAddress({ label: addrLabel, address_text: addr.address_text, lat: addr.lat, lng: addr.lng })}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left bg-transparent border-none cursor-pointer transition"
                        onMouseEnter={e => e.currentTarget.style.background = '#2A2A2A'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span className="text-lg shrink-0">{labelIcon[addr.label] || '📍'}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white m-0 capitalize">{addrLabel}</p>
                          <p className="text-xs text-white/40 m-0 truncate">{addr.address_text}</p>
                        </div>
                        {addr.is_default && <span className="text-[10px] text-primary font-medium shrink-0">Default</span>}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* Right: cart + account */}
      <div className="flex items-center gap-2">
        {role !== 'retailer' && (
          <button onClick={onCartOpen} className="glass-pill relative flex items-center gap-1.5 cursor-pointer px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/></svg>
            <span className="hidden sm:inline">Cart</span>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-black text-[11px] font-bold flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        )}

        <div className="relative" ref={dropRef}>
          <button onClick={() => setShowDropdown(!showDropdown)} className="glass-pill flex items-center gap-1.5 cursor-pointer px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-44 overflow-hidden z-[1000]" style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
              {role !== 'retailer' && (
                <Link to="/market" onClick={() => setShowDropdown(false)}
                  className="block px-4 py-2.5 text-sm text-white/80 no-underline transition"
                  onMouseEnter={e => e.currentTarget.style.background = '#2A2A2A'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  My Orders
                </Link>
              )}
              {role === 'retailer' && (
                <Link to="/dashboard" onClick={() => setShowDropdown(false)}
                  className="block px-4 py-2.5 text-sm text-white/80 no-underline transition"
                  onMouseEnter={e => e.currentTarget.style.background = '#2A2A2A'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  Dashboard
                </Link>
              )}
              <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-400 border-none bg-transparent cursor-pointer transition"
                onMouseEnter={e => e.currentTarget.style.background = '#2A2A2A'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
