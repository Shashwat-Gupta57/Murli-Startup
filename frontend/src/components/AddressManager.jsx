import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AddressAutocomplete from './AddressAutocomplete';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';
const LABELS = ['home', 'work', 'other'];
const labelIcon = { home: '🏠', work: '🏢', other: '📍' };

const AddressManager = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newAddr, setNewAddr] = useState({ address_text: '', lat: null, lng: null, label: 'home', custom_label: '', is_default: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  const fetchAddresses = async () => {
    try {
      const res = await axios.get(`${API}/api/addresses`, { headers: { Authorization: `Bearer ${token}` } });
      setAddresses(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAddresses(); }, []);

  const handleAdd = async () => {
    if (!newAddr.address_text || !newAddr.lat || !newAddr.lng) { setError('Please select an address from suggestions'); return; }
    setSaving(true); setError('');
    try {
      await axios.post(`${API}/api/addresses`, newAddr, { headers: { Authorization: `Bearer ${token}` } });
      setShowModal(false);
      setNewAddr({ address_text: '', lat: null, lng: null, label: 'home', custom_label: '', is_default: false });
      fetchAddresses();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try { await axios.delete(`${API}/api/addresses/${id}`, { headers: { Authorization: `Bearer ${token}` } }); fetchAddresses(); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleSetDefault = async (id) => {
    try { await axios.patch(`${API}/api/addresses/${id}/default`, {}, { headers: { Authorization: `Bearer ${token}` } }); fetchAddresses(); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="text-center py-16 text-text2">Loading addresses...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-lg font-semibold m-0">My Addresses <span className="text-text2 text-sm font-normal">({addresses.length})</span></h3>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-primary text-bg font-medium text-sm rounded-lg cursor-pointer border-none hover:bg-primary-hover transition">+ Add Address</button>
      </div>

      {addresses.length === 0 ? (
        <div className="bg-surface rounded-xl p-10 text-center">
          <p className="text-4xl mb-3">📍</p>
          <h3 className="text-lg font-semibold mb-1">No Addresses Saved</h3>
          <p className="text-text2 text-sm mb-4">Add your first delivery address.</p>
          <button onClick={() => setShowModal(true)} className="px-6 py-2.5 bg-primary text-bg font-medium text-sm rounded-lg cursor-pointer border-none">+ Add Address</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {addresses.map(addr => (
            <div key={addr.id} className="bg-surface rounded-xl p-4 flex items-start gap-3">
              <span className="text-2xl mt-0.5">{labelIcon[addr.label] || '📍'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold capitalize">{addr.label === 'other' ? (addr.custom_label || 'Other') : addr.label}</span>
                  {addr.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">⭐ Default</span>}
                </div>
                <p className="text-xs text-text2 m-0 leading-relaxed">{addr.address_text}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!addr.is_default && (
                  <button onClick={() => handleSetDefault(addr.id)} title="Set as default"
                    className="w-8 h-8 rounded-lg bg-surface2 border-none cursor-pointer text-text2 hover:text-primary hover:bg-primary/10 transition flex items-center justify-center text-sm">⭐</button>
                )}
                <button onClick={() => handleDelete(addr.id)} title="Delete"
                  className="w-8 h-8 rounded-lg bg-surface2 border-none cursor-pointer text-text2 hover:text-danger hover:bg-danger/10 transition flex items-center justify-center text-sm">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Address Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowModal(false)} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-surface rounded-xl p-6 z-[70] overflow-y-auto max-h-[90vh] shadow-2xl">
            <h3 className="text-base font-semibold mb-4">Add New Address</h3>
            {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm px-4 py-2.5 rounded-lg mb-4">{error}</div>}

            <div className="mb-4">
              <label className="block text-sm text-text2 mb-1">Address</label>
              <AddressAutocomplete
                value={newAddr.address_text}
                onChange={val => setNewAddr({ ...newAddr, address_text: val, lat: null, lng: null })}
                onSelect={s => setNewAddr({ ...newAddr, address_text: s.label, lat: s.lat, lng: s.lng })}
                placeholder="Start typing address..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-text2 mb-2">Label</label>
              <div className="flex gap-2">
                {LABELS.map(l => (
                  <button key={l} type="button" onClick={() => setNewAddr({ ...newAddr, label: l })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border-none cursor-pointer transition capitalize
                      ${newAddr.label === l ? 'bg-primary text-bg' : 'bg-surface2 text-text2 hover:bg-border'}`}>
                    {labelIcon[l]} {l}
                  </button>
                ))}
              </div>
            </div>

            {newAddr.label === 'other' && (
              <div className="mb-4">
                <label className="block text-sm text-text2 mb-1">Custom Label</label>
                <input type="text" value={newAddr.custom_label} onChange={e => setNewAddr({ ...newAddr, custom_label: e.target.value })}
                  className="w-full px-4 py-3 bg-surface2 border border-border rounded-lg text-text text-sm focus:border-primary focus:outline-none transition placeholder:text-text2"
                  placeholder="e.g. Grandma's house" />
              </div>
            )}

            <label className="flex items-center gap-2 mb-5 cursor-pointer">
              <input type="checkbox" checked={newAddr.is_default} onChange={e => setNewAddr({ ...newAddr, is_default: e.target.checked })}
                className="w-4 h-4 accent-[#F8C200]" />
              <span className="text-sm text-text2">Set as default address</span>
            </label>

            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-lg bg-surface2 text-text font-medium text-sm cursor-pointer border-none hover:bg-border transition">Cancel</button>
              <button onClick={handleAdd} disabled={saving} className="flex-1 py-3 rounded-lg bg-primary text-bg font-semibold text-sm cursor-pointer border-none hover:bg-primary-hover transition disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Address'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AddressManager;
