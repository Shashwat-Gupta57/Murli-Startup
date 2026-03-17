import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'http://localhost:5000';

const AddressAutocomplete = ({
  value, onChange, onSelect,
  placeholder = 'Start typing an address...'
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const updatePos = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (showDropdown) {
      updatePos();
      window.addEventListener('scroll', updatePos, true);
      window.addEventListener('resize', updatePos);
      return () => {
        window.removeEventListener('scroll', updatePos, true);
        window.removeEventListener('resize', updatePos);
      };
    }
  }, [showDropdown, updatePos]);

  useEffect(() => {
    const handler = e => {
      if (
        inputRef.current && !inputRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = useCallback(async (text) => {
    if (!text || text.length < 3) { setSuggestions([]); setShowDropdown(false); return; }
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/geocode/autocomplete`, { params: { text } });
      setSuggestions(res.data);
      setShowDropdown(res.data.length > 0);
    } catch {
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
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
    <>
      <div className="relative" style={{ zIndex: 1 }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) { updatePos(); setShowDropdown(true); } }}
          className="glass-input w-full px-4 py-3 text-sm"
          placeholder={placeholder}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white/15 border-t-yellow-400 rounded-full animate-spin" />
        )}
      </div>

      {showDropdown && suggestions.length > 0 && createPortal(
        <ul
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            zIndex: 999999,
            maxHeight: '220px',
            overflowY: 'auto',
            listStyle: 'none',
            padding: '4px',
            margin: 0,
            borderRadius: '14px',
            backgroundColor: '#0F0F19',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={i}
              onMouseDown={e => { e.preventDefault(); handleSelect(s); }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#ffffff',
                lineHeight: '1.5',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ color: '#F8C200', flexShrink: 0, marginTop: '2px' }}>📍</span>
              <span style={{ color: '#ffffff' }}>{s.label}</span>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </>
  );
};

export default AddressAutocomplete;