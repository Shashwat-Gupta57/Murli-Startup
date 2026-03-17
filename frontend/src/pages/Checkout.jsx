import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import AddressAutocomplete from '../components/AddressAutocomplete';
import Navbar from '../components/Navbar';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';
const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || `${API}/uploads`;

const Checkout = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, clearCart, subtotal } = useCart();
  const { showToast } = useToast();
  const [userProfile, setUserProfile] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressMode, setAddressMode] = useState('saved'); // 'saved' | 'new'
  const [selectedAddrId, setSelectedAddrId] = useState(null);
  const [customAddress, setCustomAddress] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState({ lat: null, lng: null });
  const [deliveryFees, setDeliveryFees] = useState({});
  const [feeLoading, setFeeLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    const init = async () => {
      try {
        const [profileRes, addrRes] = await Promise.all([
          axios.get(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/api/addresses`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setUserProfile(profileRes.data);
        setSavedAddresses(addrRes.data);

        // Pre-populate from selectedDeliveryAddress in localStorage
        const storedAddr = (() => { try { return JSON.parse(localStorage.getItem('selectedDeliveryAddress')); } catch { return null; } })();
        if (storedAddr && addrRes.data.length > 0) {
          // Try to match with saved addresses by lat/lng
          const match = addrRes.data.find(a =>
            parseFloat(a.lat).toFixed(5) === parseFloat(storedAddr.lat).toFixed(5) &&
            parseFloat(a.lng).toFixed(5) === parseFloat(storedAddr.lng).toFixed(5)
          );
          if (match) {
            setSelectedAddrId(match.id);
          } else {
            // Use as custom address
            setAddressMode('new');
            setCustomAddress(storedAddr.address_text || '');
            setDeliveryCoords({ lat: storedAddr.lat, lng: storedAddr.lng });
          }
        } else {
          // Fallback to default address
          const def = addrRes.data.find(a => a.is_default);
          if (def) setSelectedAddrId(def.id);
        }
      } catch (err) { console.error(err); }
    };
    init();
  }, [token, navigate]);

  const groupedByBusiness = items.reduce((acc, item) => {
    const bizId = item.product.business_id;
    if (!acc[bizId]) acc[bizId] = { business_name: item.product.business_name, items: [] };
    acc[bizId].items.push(item);
    return acc;
  }, {});

  const getDeliveryCoords = () => {
    if (addressMode === 'saved') {
      const addr = savedAddresses.find(a => a.id === selectedAddrId);
      return addr ? { lat: parseFloat(addr.lat), lng: parseFloat(addr.lng) } : { lat: null, lng: null };
    }
    return deliveryCoords;
  };

  const getDeliveryAddress = () => {
    if (addressMode === 'saved') {
      const addr = savedAddresses.find(a => a.id === selectedAddrId);
      return addr?.address_text || '';
    }
    return customAddress;
  };

  const calculateDeliveryFees = async () => {
    setFeeLoading(true); setError('');
    const coords = getDeliveryCoords();
    const address = getDeliveryAddress();
    if (!address.trim()) { setError('Please provide a delivery address'); setFeeLoading(false); return; }
    if (!coords.lat || !coords.lng) { setError('Please select an address with valid coordinates'); setFeeLoading(false); return; }
    try {
      const fees = {};
      for (const bizId of Object.keys(groupedByBusiness)) {
        const res = await axios.post(`${API}/api/orders/delivery-fee`, { business_id: parseInt(bizId), delivery_lat: coords.lat, delivery_lng: coords.lng }, { headers: { Authorization: `Bearer ${token}` } });
        fees[bizId] = { fee: res.data.delivery_fee, distance: res.data.distance_meters, outside: res.data.outside_range, lat: coords.lat, lng: coords.lng };
      }
      setDeliveryFees(fees);
    } catch (err) { setError('Failed to calculate delivery fees'); }
    finally { setFeeLoading(false); }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    setLocLoading(true); setError('');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const res = await axios.get(`${API}/api/geocode/reverse`, { params: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
          setCustomAddress(res.data.address || '');
          setDeliveryCoords({ lat: res.data.lat, lng: res.data.lng });
          setAddressMode('new');
        } catch (err) { setError('Failed to get address'); }
        finally { setLocLoading(false); }
      },
      () => { setError('Location access denied'); setLocLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const totalDeliveryFee = Object.values(deliveryFees).reduce((s, f) => s + (f.fee || 0), 0);
  const anyOutsideRange = Object.values(deliveryFees).some(f => f.outside);
  const grandTotal = subtotal + totalDeliveryFee;
  const feesCalculated = Object.keys(deliveryFees).length > 0;

  const handlePlaceOrder = async () => {
    if (anyOutsideRange) { setError('Some businesses are outside delivery range'); return; }
    setOrderLoading(true); setError('');
    try {
      const address = getDeliveryAddress();
      for (const [bizId, group] of Object.entries(groupedByBusiness)) {
        const feeInfo = deliveryFees[bizId];
        await axios.post(`${API}/api/orders`, {
          business_id: parseInt(bizId),
          items: group.items.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
          delivery_address: address, delivery_lat: feeInfo?.lat, delivery_lng: feeInfo?.lng, delivery_fee: feeInfo?.fee || 0
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      setOrderSuccess(true);
      clearCart();
      showToast('Order placed successfully!');
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'insufficient_stock') {
        showToast(`Sorry, only ${data.available} units of ${data.product_name} are available.`, 'error');
      } else {
        setError(data?.error || 'Failed to place order');
      }
    } finally { setOrderLoading(false); }
  };

  if (orderSuccess) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl p-10 text-center max-w-sm w-full">
        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4"><span className="text-success text-3xl">✓</span></div>
        <h2 className="text-xl font-bold mb-2">Order Placed!</h2>
        <p className="text-text2 text-sm mb-6">Your order has been confirmed. Payment: Cash on Delivery.</p>
        <button onClick={() => navigate('/market')} className="w-full py-3 bg-primary text-bg font-semibold text-sm rounded-lg cursor-pointer border-none hover:bg-primary-hover transition">Continue Shopping</button>
      </div>
    </div>
  );

  if (items.length === 0) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl p-10 text-center max-w-sm w-full">
        <p className="text-4xl mb-3">🛒</p>
        <h2 className="text-xl font-bold mb-2">Cart is Empty</h2>
        <p className="text-text2 text-sm mb-6">Add products from the marketplace.</p>
        <button onClick={() => navigate('/market')} className="w-full py-3 bg-primary text-bg font-semibold text-sm rounded-lg cursor-pointer border-none hover:bg-primary-hover transition">Browse Products</button>
      </div>
    </div>
  );

  const labelIcon = { home: '🏠', work: '🏢', other: '📍' };

  return (
    <div className="min-h-screen bg-bg">
      <Navbar onCartOpen={() => {}} />
      <main className="pt-20 pb-8 px-4 md:px-8 max-w-5xl mx-auto">
        <button onClick={() => navigate('/market')} className="text-text2 text-sm mb-4 bg-transparent border-none cursor-pointer hover:text-text transition flex items-center gap-1">← Back to Market</button>
        <h2 className="text-xl font-bold mb-6">Checkout</h2>
        {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm px-4 py-2.5 rounded-lg mb-5">{error}</div>}

        <div className="grid md:grid-cols-5 gap-6">
          {/* Left */}
          <div className="md:col-span-3 flex flex-col gap-5">
            {/* ══ Address ══ */}
            <div className="bg-surface rounded-xl p-5">
              <h3 className="text-base font-semibold mb-4">Delivery Address</h3>

              {/* Mode toggle */}
              <div className="flex bg-surface2 rounded-full p-1 mb-4">
                <button onClick={() => setAddressMode('saved')} className={`flex-1 py-2 rounded-full text-sm font-medium border-none cursor-pointer transition ${addressMode === 'saved' ? 'bg-primary text-bg' : 'bg-transparent text-text2'}`}>Saved Addresses</button>
                <button onClick={() => setAddressMode('new')} className={`flex-1 py-2 rounded-full text-sm font-medium border-none cursor-pointer transition ${addressMode === 'new' ? 'bg-primary text-bg' : 'bg-transparent text-text2'}`}>One-time Address</button>
              </div>

              {addressMode === 'saved' ? (
                savedAddresses.length === 0 ? (
                  <div className="text-center py-6 text-text2 text-sm">No saved addresses. Add one in your profile or enter a one-time address.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {savedAddresses.map(addr => (
                      <button key={addr.id} onClick={() => setSelectedAddrId(addr.id)}
                        className={`w-full text-left p-3 rounded-lg border transition cursor-pointer
                          ${selectedAddrId === addr.id ? 'border-primary bg-primary/5' : 'border-border bg-surface2 hover:border-text2'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{labelIcon[addr.label] || '📍'}</span>
                          <span className="text-sm font-semibold capitalize">{addr.label === 'other' ? (addr.custom_label || 'Other') : addr.label}</span>
                          {addr.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Default</span>}
                        </div>
                        <p className="text-xs text-text2 m-0 leading-relaxed">{addr.address_text}</p>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <AddressAutocomplete value={customAddress} onChange={val => setCustomAddress(val)} onSelect={s => { setCustomAddress(s.label); setDeliveryCoords({ lat: s.lat, lng: s.lng }); }} placeholder="Start typing delivery address..." />
              )}

              <div className="flex gap-2 mt-3">
                <button onClick={handleUseMyLocation} disabled={locLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-surface2 border border-border rounded-lg text-sm text-text cursor-pointer hover:bg-border transition disabled:opacity-50">
                  {locLoading ? <span className="w-3.5 h-3.5 border-2 border-border border-t-primary rounded-full animate-spin" /> : '📍'} Use my location
                </button>
                <button onClick={calculateDeliveryFees} disabled={feeLoading}
                  className="flex-1 py-2 bg-primary text-bg font-medium text-sm rounded-lg cursor-pointer border-none hover:bg-primary-hover transition disabled:opacity-50">
                  {feeLoading ? 'Calculating...' : feesCalculated ? 'Recalculate' : 'Calculate Fee'}
                </button>
              </div>
            </div>

            {/* ══ Items ══ */}
            {Object.entries(groupedByBusiness).map(([bizId, group]) => (
              <div key={bizId} className="bg-surface rounded-xl p-5">
                <h4 className="text-sm font-semibold text-primary mb-3">{group.business_name}</h4>
                <div className="flex flex-col gap-2.5">
                  {group.items.map(({ product, quantity }) => (
                    <div key={product.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-surface2 shrink-0 overflow-hidden">
                        {product.image1_url ? <img src={`${UPLOADS_URL}${product.image1_url.replace(/^\/uploads/, '')}`} className="w-full h-full object-cover" /> : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm m-0 truncate">{product.name}</p>
                        <p className="text-xs text-text2 m-0">₹{product.price}/{product.unit}</p>
                      </div>
                      <div className="flex items-center bg-surface2 rounded-lg overflow-hidden">
                        <button onClick={() => updateQuantity(product.id, quantity - 1)} className="w-6 h-6 border-none bg-transparent text-primary cursor-pointer text-sm font-bold">−</button>
                        <span className="w-4 text-center text-xs font-semibold">{quantity}</span>
                        <button onClick={() => updateQuantity(product.id, quantity + 1)} className="w-6 h-6 border-none bg-transparent text-primary cursor-pointer text-sm font-bold">+</button>
                      </div>
                      <p className="text-sm font-medium m-0 w-16 text-right">₹{(parseFloat(product.price) * quantity).toFixed(2)}</p>
                      <button onClick={() => removeFromCart(product.id)} className="text-danger text-xs bg-transparent border-none cursor-pointer">✕</button>
                    </div>
                  ))}
                </div>
                {feesCalculated && deliveryFees[bizId] && (
                  <div className="mt-3 pt-3 border-t border-border text-sm">
                    {deliveryFees[bizId].outside
                      ? <span className="text-danger">⚠ Outside range ({(deliveryFees[bizId].distance / 1000).toFixed(1)} km)</span>
                      : <span className="text-text2">Delivery: ₹{deliveryFees[bizId].fee} ({(deliveryFees[bizId].distance / 1000).toFixed(1)} km)</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right: bill */}
          <div className="md:col-span-2">
            <div className="bg-surface rounded-xl p-5 md:sticky md:top-20">
              <h3 className="text-base font-semibold mb-4">Bill Details</h3>
              <div className="flex justify-between text-sm text-text2 mb-2"><span>Subtotal</span><span className="text-text">₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-text2 mb-2"><span>Delivery Fee</span><span className="text-text">{feesCalculated ? (anyOutsideRange ? '—' : `₹${totalDeliveryFee.toFixed(2)}`) : '—'}</span></div>
              <div className="flex justify-between text-base font-bold mt-3 pt-3 border-t border-border"><span>Grand Total</span><span className="text-primary">₹{grandTotal.toFixed(2)}</span></div>
              <div className="text-xs text-text2 mt-3 flex items-center gap-1">💵 Cash on Delivery</div>
              {feesCalculated && (
                <button onClick={handlePlaceOrder} disabled={orderLoading || anyOutsideRange}
                  className="w-full mt-5 py-3 bg-primary text-bg font-semibold text-sm rounded-lg cursor-pointer border-none hover:bg-primary-hover transition disabled:opacity-50">
                  {orderLoading ? 'Placing Order...' : 'Place Order — Cash on Delivery'}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
