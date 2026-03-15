import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';
const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || `${API}/uploads`;
const inputCls = "w-full px-4 py-3 bg-surface2 border border-border rounded-lg text-text text-sm focus:border-primary focus:outline-none transition placeholder:text-text2";

const ProductForm = ({ product, businessId, onSave, onCancel }) => {
  const [form, setForm] = useState({ name: '', description: '', price: '', unit: 'per piece', stock_qty: '' });
  const [image1, setImage1] = useState(null);
  const [image2, setImage2] = useState(null);
  const [preview1, setPreview1] = useState(null);
  const [preview2, setPreview2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setForm({ name: product.name || '', description: product.description || '', price: product.price || '', unit: product.unit || 'per piece', stock_qty: product.stock_qty || '' });
      if (product.image1_url) setPreview1(`${UPLOADS_URL}${product.image1_url.replace(/^\/uploads/, '')}`);
      if (product.image2_url) setPreview2(`${UPLOADS_URL}${product.image2_url.replace(/^\/uploads/, '')}`);
    }
  }, [product]);

  const handleFile = (e, setFile, setPreview) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) { setError('Only JPEG and PNG'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('File must be under 2MB'); return; }
    setError(''); setFile(file); setPreview(URL.createObjectURL(file));
  };

  const onSubmit = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const data = new FormData();
      data.append('name', form.name); data.append('description', form.description);
      data.append('price', form.price); data.append('unit', form.unit); data.append('stock_qty', form.stock_qty);
      if (!product) data.append('business_id', businessId);
      if (image1) data.append('image1', image1);
      if (image2) data.append('image2', image2);
      await axios({ method: product ? 'put' : 'post', url: product ? `${API}/api/products/${product.id}` : `${API}/api/products`, data, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
      onSave();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold m-0">{product ? 'Edit Product' : 'Add New Product'}</h3>
      {error && <div className="bg-danger/10 border border-danger/20 text-danger text-sm px-4 py-2.5 rounded-lg">{error}</div>}

      <div>
        <label className="block text-sm text-text2 mb-1">Product Name</label>
        <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} required placeholder="e.g. Basmati Rice" />
      </div>
      <div>
        <label className="block text-sm text-text2 mb-1">Description</label>
        <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={`${inputCls} resize-y`} placeholder="Brief description" rows={3} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-text2 mb-1">Price (₹)</label>
          <input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className={inputCls} required placeholder="0.00" min="0" />
        </div>
        <div>
          <label className="block text-sm text-text2 mb-1">Unit</label>
          <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className={inputCls}>
            <option value="per piece">per piece</option>
            <option value="per kg">per kg</option>
            <option value="per dozen">per dozen</option>
            <option value="per litre">per litre</option>
            <option value="per pack">per pack</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-text2 mb-1">Stock</label>
          <input type="number" value={form.stock_qty} onChange={e => setForm({...form, stock_qty: e.target.value})} className={inputCls} placeholder="0" min="0" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[['img1', preview1, setImage1, setPreview1, '1'], ['img2', preview2, setImage2, setPreview2, '2']].map(([id, preview, setFile, setPreview, n]) => (
          <div key={id}>
            <label className="block text-sm text-text2 mb-1">Image {n}</label>
            <div onClick={() => document.getElementById(id).click()} className="h-32 bg-surface2 rounded-lg border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition overflow-hidden">
              {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : <span className="text-text2 text-sm">+ Upload</span>}
            </div>
            <input id={id} type="file" accept="image/jpeg,image/png" onChange={e => handleFile(e, setFile, setPreview)} hidden />
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-lg bg-surface2 text-text font-medium text-sm cursor-pointer border-none hover:bg-border transition">Cancel</button>
        <button type="submit" disabled={loading} className="flex-1 py-3 rounded-lg bg-primary text-bg font-semibold text-sm cursor-pointer border-none hover:bg-primary-hover transition disabled:opacity-50">
          {loading ? 'Saving...' : product ? 'Update' : 'Add Product'}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
