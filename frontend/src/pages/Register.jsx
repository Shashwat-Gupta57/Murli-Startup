import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import AddressAutocomplete from '../components/AddressAutocomplete';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', address: '',
    lat: null, lng: null, isRetailer: false
  });
  const [error, setError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [addressSelectedFromDropdown, setAddressSelectedFromDropdown] = useState(false);
  const navigate = useNavigate();
  const { name, email, password, phone, address, lat, lng, isRetailer } = formData;

  const onChange = e => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const onSubmit = async e => {
    e.preventDefault();
    setError(''); setAddressError('');

    if (!addressSelectedFromDropdown) {
      setAddressError('Please select a valid address from the suggestions');
      return;
    }

    const role = isRetailer ? 'retailer' : 'customer';
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/register`, { name, email, password, phone, address, role, lat, lng });
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
      navigate(role === 'retailer' ? '/dashboard' : '/market');
    } catch (err) {
      const errMsg = err.response?.data?.error;
      if (errMsg === 'invalid_address') {
        setAddressError('Please select a valid address from the suggestions');
      } else {
        setError(errMsg || 'Registration failed');
      }
    }
  };

  const inputCls = "w-full px-4 py-3 bg-surface2 border border-border rounded-lg text-text text-sm focus:border-primary focus:outline-none transition placeholder:text-text2";

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface rounded-xl p-8 shadow-xl">
        <h2 className="text-center text-2xl font-bold mb-1">
          <span className="text-primary">Murli</span>
        </h2>
        <p className="text-center text-text2 text-sm mb-6">Create your account</p>

        {/* Role toggle */}
        <div className="flex bg-surface2 rounded-full p-1 mb-6">
          <button type="button" onClick={() => setFormData({ ...formData, isRetailer: false })}
            className={`flex-1 py-2 rounded-full text-sm font-medium border-none cursor-pointer transition ${!isRetailer ? 'bg-primary text-bg' : 'bg-transparent text-text2'}`}>
            I'm a Customer
          </button>
          <button type="button" onClick={() => setFormData({ ...formData, isRetailer: true })}
            className={`flex-1 py-2 rounded-full text-sm font-medium border-none cursor-pointer transition ${isRetailer ? 'bg-primary text-bg' : 'bg-transparent text-text2'}`}>
            I'm a Retailer
          </button>
        </div>

        {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm px-4 py-2.5 rounded-lg mb-5">{error}</div>}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <input type="text" name="name" value={name} onChange={onChange} placeholder="Full Name" required className={inputCls} />
          <input type="email" name="email" value={email} onChange={onChange} placeholder="Email Address" required className={inputCls} />
          <input type="password" name="password" value={password} onChange={onChange} placeholder="Password" required className={inputCls} />
          <input type="text" name="phone" value={phone} onChange={onChange} placeholder="Phone Number" className={inputCls} />
          <div>
            <AddressAutocomplete
              value={address}
              onChange={val => {
                setFormData({ ...formData, address: val, lat: null, lng: null });
                setAddressSelectedFromDropdown(false);
                setAddressError('');
              }}
              onSelect={s => {
                setFormData({ ...formData, address: s.label, lat: s.lat, lng: s.lng });
                setAddressSelectedFromDropdown(true);
                setAddressError('');
              }}
              placeholder="Start typing your address..."
            />
            {addressError && <p className="text-danger text-xs mt-1.5 m-0">{addressError}</p>}
          </div>
          <button type="submit" className="w-full py-3 bg-primary text-bg font-semibold text-sm rounded-lg cursor-pointer border-none hover:bg-primary-hover transition mt-2">
            Sign Up
          </button>
        </form>

        <p className="text-center text-text2 text-sm mt-6">
          Already have an account? <Link to="/login" className="text-primary font-medium no-underline hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
