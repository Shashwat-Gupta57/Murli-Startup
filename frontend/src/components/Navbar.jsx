import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
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
  const userName = 'Account';

  // Selected delivery address (full object: { label, address_text, lat, lng })
  const [selectedAddr, setSelectedAddr] = useState(() => {
    try { return JSON.parse(localStorage.getItem('selectedDeliveryAddress')) || null; } catch { return null; }
  });
  const [addresses, setAddresses] = useState([]);
  const [loadingLoc, setLoadingLoc] = useState(false);

  // On mount, if no selected address, try to get user's default address
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
    // Clean up old selectedCity key
    localStorage.removeItem('selectedCity');
  }, []);

  // Fetch saved addresses when location modal opens
  useEffect(() => {
    if (showLocationModal && token) {
      axios.get(`${API}/api/addresses`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setAddresses(res.data))
        .catch(() => {});
    }
  }, [showLocationModal]);

  // Close dropdowns on outside click
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
          selectAddress({
            label: 'Current Location',
            address_text: res.data.address || 'Current Location',
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
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
    <nav className="fixed top-0 left-0 right-0 h-16 bg-bg border-b border-surface2 z-50 flex items-center px-4 md:px-8">
      {/* Left: brand */}
      <Link to={role === 'retailer' ? '/dashboard' : '/market'} className="text-primary font-bold text-xl tracking-tight no-underline shrink-0">
        Murli
      </Link>

      {/* Address selector (next to brand, customers only) */}
      {role !== 'retailer' && (
        <div className="relative ml-3" ref={locRef}>
          <button
            onClick={() => setShowLocationModal(!showLocationModal)}
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-left py-1 px-2 rounded-lg hover:bg-surface transition max-w-[180px] md:max-w-[240px]"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-primary shrink-0">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="text-xs text-text truncate">
              {displayLabel}
            </span>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-text2 shrink-0">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {showLocationModal && (
            <div className="absolute left-0 top-full mt-2 w-72 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-border">
                <h4 className="text-sm font-semibold m-0 text-text">Choose delivery address</h4>
              </div>

              {/* Use current location */}
              <button
                onClick={handleUseCurrentLocation}
                disabled={loadingLoc}
                className="w-full flex items-center gap-3 px-4 py-3 text-left bg-transparent border-none cursor-pointer hover:bg-surface2 transition text-sm"
              >
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-primary">
                    <path d="M12 2v2m0 16v2M2 12h2m16 0h2M12 8a4 4 0 100 8 4 4 0 000-8z"/>
                  </svg>
                </span>
                <span className="text-primary font-medium">
                  {loadingLoc ? 'Detecting...' : 'Use current location'}
                </span>
              </button>

              {/* Saved addresses */}
              {addresses.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-surface2/50">
                    <span className="text-[11px] text-text2 uppercase tracking-wide font-medium">Saved Addresses</span>
                  </div>
                  {addresses.map(addr => {
                    const addrLabel = addr.label === 'other' ? (addr.custom_label || 'Other') : addr.label;
                    return (
                      <button
                        key={addr.id}
                        onClick={() => selectAddress({ label: addrLabel, address_text: addr.address_text, lat: addr.lat, lng: addr.lng })}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left bg-transparent border-none cursor-pointer hover:bg-surface2 transition"
                      >
                        <span className="text-lg shrink-0">{labelIcon[addr.label] || '📍'}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-text m-0 capitalize">{addrLabel}</p>
                          <p className="text-xs text-text2 m-0 truncate">{addr.address_text}</p>
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
