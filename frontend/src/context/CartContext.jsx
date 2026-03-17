import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('cartData');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Persist cart to localStorage on every change
  useEffect(() => {
    localStorage.setItem('cartData', JSON.stringify(items));
  }, [items]);

  const addToCart = useCallback((product, qty = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  }, []);

  const updateQuantity = useCallback((productId, qty) => {
    if (qty <= 0) {
      setItems(prev => prev.filter(i => i.product.id !== productId));
    } else {
      setItems(prev => prev.map(i =>
        i.product.id === productId ? { ...i, quantity: qty } : i
      ));
    }
  }, []);

  const removeFromCart = useCallback((productId) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem('cartData');
  }, []);

  // Remove unavailable items (called by Market page after fetching products)
  const pruneUnavailable = useCallback((availableProductIds) => {
    setItems(prev => {
      const filtered = prev.filter(i => availableProductIds.has(i.product.id));
      if (filtered.length !== prev.length) return filtered;
      return prev; // no change, don't trigger re-render
    });
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + parseFloat(i.product.price) * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, addToCart, updateQuantity, removeFromCart, clearCart, pruneUnavailable, totalItems, subtotal
    }}>
      {children}
    </CartContext.Provider>
  );
};
