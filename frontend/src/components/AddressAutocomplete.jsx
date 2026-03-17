import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';

const AddressAutocomplete = ({ value, onChange, onSelect, placeholder = 'Start typing an address...' }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = e => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = useCallback(async (text) => {
    if (!text || text.length < 3) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/geocode/autocomplete`, { params: { text } });
      setSuggestions(res.data);
      setShowDropdown(res.data.length > 0);
    } catch (err) { setSuggestions([]); }
    finally { setLoading(false); }
  }, []);

  const handleInputChange = e => {
    const val = e.target.value;
    onChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 400);
  };

  const handleSelect = s => {
    onChange(s.label);
    if (onSelect) onSelect(s);
    setShowDropdown(false);
    setSuggestions([]);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text" value={value} onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          className="glass-input w-full px-4 py-3 text-sm"
          placeholder={placeholder} autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white/15 border-t-primary rounded-full animate-spin" />
        )}
      </div>
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 z-50 glass-card max-h-52 overflow-y-auto list-none p-1 m-0">
          {suggestions.map((s, i) => (
            <li key={i} onClick={() => handleSelect(s)}
              className="flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-white hover:bg-white/5 transition leading-relaxed">
              <span className="text-primary shrink-0 mt-0.5">📍</span>
              <span>{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
