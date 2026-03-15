import React, { useState } from 'react';
import axios from 'axios';
import AddressAutocomplete from '../components/AddressAutocomplete';

const TAG_OPTIONS = ['General Store', 'Stationary', 'Bookstore', 'Medical', 'Grocery', 'Electronics', 'Other'];
const inputCls = "w-full px-4 py-3 bg-surface2 border border-border rounded-lg text-text text-sm focus:border-primary focus:outline-none transition placeholder:text-text2";

const CreateBusiness = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    owner_name: '', home_phone: '', home_address: '', home_lat: null, home_lng: null,
    aadhar_number: '', business_name: '', business_phone: '', business_address: '',
    business_lat: null, business_lng: null, tags: [],
    delivery_tiers: [{ max_distance_meters: '', fee_rupees: '' }]
  });

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });
  const toggleTag = tag => setFormData(p => ({ ...p, tags: p.tags.includes(tag) ? p.tags.filter(t => t !== tag) : [...p.tags, tag] }));
  const updateTier = (i, f, v) => { const t = [...formData.delivery_tiers]; t[i][f] = v; setFormData({ ...formData, delivery_tiers: t }); };
  const addTier = () => setFormData({ ...formData, delivery_tiers: [...formData.delivery_tiers, { max_distance_meters: '', fee_rupees: '' }] });
  const removeTier = i => { const t = formData.delivery_tiers.filter((_, j) => j !== i); setFormData({ ...formData, delivery_tiers: t.length ? t : [{ max_distance_meters: '', fee_rupees: '' }] }); };
  const nextStep = () => { setError(''); setStep(s => s + 1); };
  const prevStep = () => { setError(''); setStep(s => s - 1); };

  const onSubmit = async () => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const payload = { ...formData, delivery_tiers: formData.delivery_tiers.filter(t => t.max_distance_meters && t.fee_rupees).map(t => ({ max_distance_meters: parseInt(t.max_distance_meters), fee_rupees: parseInt(t.fee_rupees) })) };
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/businesses`, payload, { headers: { Authorization: `Bearer ${token}` } });
      if (onComplete) onComplete();
    } catch (err) { setError(err.response?.data?.error || 'Failed to create business'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <React.Fragment key={s}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition
              ${step >= s ? 'bg-primary text-bg' : 'bg-surface2 text-text2'}`}>{s}</div>
            {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-primary' : 'bg-surface2'}`} />}
          </React.Fragment>
        ))}
      </div>

      {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm px-4 py-2.5 rounded-lg mb-4">{error}</div>}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold m-0">Personal Info</h3>
          <div><label className="block text-sm text-text2 mb-1">Full Name</label><input type="text" name="owner_name" value={formData.owner_name} onChange={onChange} className={inputCls} placeholder="Your full name" /></div>
          <div><label className="block text-sm text-text2 mb-1">Home Phone</label><input type="text" name="home_phone" value={formData.home_phone} onChange={onChange} className={inputCls} placeholder="Phone number" /></div>
          <div><label className="block text-sm text-text2 mb-1">Home Address</label>
            <AddressAutocomplete value={formData.home_address} onChange={v => setFormData({ ...formData, home_address: v })} onSelect={s => setFormData({ ...formData, home_address: s.label, home_lat: s.lat, home_lng: s.lng })} placeholder="Start typing your home address..." />
          </div>
          <div><label className="block text-sm text-text2 mb-1">Aadhar Number</label><input type="text" name="aadhar_number" value={formData.aadhar_number} onChange={onChange} className={inputCls} placeholder="12-digit Aadhar" /></div>
          <button onClick={nextStep} className="w-full py-3 bg-primary text-bg font-semibold text-sm rounded-lg cursor-pointer border-none hover:bg-primary-hover transition mt-2">Next →</button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold m-0">Business Details</h3>
          <div><label className="block text-sm text-text2 mb-1">Business Name</label><input type="text" name="business_name" value={formData.business_name} onChange={onChange} className={inputCls} placeholder="Name of your store" /></div>
          <div><label className="block text-sm text-text2 mb-1">Business Phone</label><input type="text" name="business_phone" value={formData.business_phone} onChange={onChange} className={inputCls} placeholder="Business phone" /></div>
          <div><label className="block text-sm text-text2 mb-1">Business Address</label>
            <AddressAutocomplete value={formData.business_address} onChange={v => setFormData({ ...formData, business_address: v })} onSelect={s => setFormData({ ...formData, business_address: s.label, business_lat: s.lat, business_lng: s.lng })} placeholder="Start typing business address..." />
          </div>
          <div>
            <label className="block text-sm text-text2 mb-2">Business Type</label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map(tag => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border-none cursor-pointer transition
                    ${formData.tags.includes(tag) ? 'bg-primary text-bg' : 'bg-surface2 text-text hover:bg-border'}`}>{tag}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={prevStep} className="flex-1 py-3 bg-surface2 text-text font-medium text-sm rounded-lg cursor-pointer border-none hover:bg-border transition">← Back</button>
            <button onClick={nextStep} className="flex-1 py-3 bg-primary text-bg font-semibold text-sm rounded-lg cursor-pointer border-none hover:bg-primary-hover transition">Next →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold m-0">Delivery Fee Tiers</h3>
          {formData.delivery_tiers.map((tier, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1"><label className="block text-sm text-text2 mb-1">Up to (m)</label><input type="number" value={tier.max_distance_meters} onChange={e => updateTier(i, 'max_distance_meters', e.target.value)} className={inputCls} placeholder="2000" min="0" /></div>
              <span className="text-text2 pb-3">→</span>
              <div className="flex-1"><label className="block text-sm text-text2 mb-1">Fee (₹)</label><input type="number" value={tier.fee_rupees} onChange={e => updateTier(i, 'fee_rupees', e.target.value)} className={inputCls} placeholder="30" min="0" /></div>
              <button type="button" onClick={() => removeTier(i)} className="w-9 h-9 rounded-lg bg-danger/10 text-danger border-none cursor-pointer mb-0.5 flex items-center justify-center shrink-0">✕</button>
            </div>
          ))}
          <button type="button" onClick={addTier} className="text-sm text-primary bg-transparent border-none cursor-pointer hover:underline text-left">+ Add Tier</button>
          <div className="flex gap-3 mt-2">
            <button onClick={prevStep} className="flex-1 py-3 bg-surface2 text-text font-medium text-sm rounded-lg cursor-pointer border-none hover:bg-border transition">← Back</button>
            <button onClick={onSubmit} disabled={loading} className="flex-1 py-3 bg-primary text-bg font-semibold text-sm rounded-lg cursor-pointer border-none hover:bg-primary-hover transition disabled:opacity-50">{loading ? 'Creating...' : '✓ Create Business'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateBusiness;
