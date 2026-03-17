import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';

const CartDrawer = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, subtotal, totalItems } = useCart();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-0 right-0 h-full w-full max-w-md z-[70] flex flex-col"
        style={{
          background: 'rgba(10, 10, 20, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h3 className="text-lg font-semibold m-0 text-white">My Cart <span className="text-white/40 text-sm font-normal">({totalItems} items)</span></h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 border-none text-white cursor-pointer flex items-center justify-center text-lg hover:bg-white/10 transition">✕</button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              <p className="text-4xl mb-3">🛒</p>
              <p className="font-medium">Your cart is empty</p>
              <p className="text-sm mt-1">Browse products and add to cart</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center gap-3 glass-card p-3" style={{ borderRadius: 12 }}>
                  <div className="w-14 h-14 rounded-lg bg-white/5 shrink-0 overflow-hidden relative">
                    {product.image1_url ? (
                      <img src={`${import.meta.env.VITE_UPLOADS_URL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') + '/uploads' : 'http://localhost:5000/uploads')}${product.image1_url.replace(/^\/uploads/, '')}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white/30 text-xs flex items-center justify-center h-full">No img</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate m-0 text-white">{product.name}</p>
                    <p className="text-xs text-white/40 m-0 mt-0.5">{product.unit}</p>
                    <p className="text-sm font-bold m-0 mt-1 text-primary">₹{(parseFloat(product.price) * quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-0 glass-pill overflow-hidden">
                    <button onClick={() => updateQuantity(product.id, quantity - 1)} className="w-8 h-8 border-none bg-transparent text-primary cursor-pointer text-lg font-bold hover:bg-white/10 transition">−</button>
                    <span className="w-6 text-center text-sm font-semibold text-white">{quantity}</span>
                    <button onClick={() => updateQuantity(product.id, quantity + 1)} className="w-8 h-8 border-none bg-transparent text-primary cursor-pointer text-lg font-bold hover:bg-white/10 transition">+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom sticky */}
        {items.length > 0 && (
          <div className="px-5 py-4">
            <div className="glass-card p-4" style={{ borderRadius: 14 }}>
              <div className="flex justify-between text-sm text-white/50 mb-1"><span>Subtotal</span><span className="text-white font-medium">₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm text-white/50 mb-3"><span>Delivery</span><span className="text-white/30 text-xs">Add address to calculate</span></div>
              <div className="flex justify-between text-base font-bold mb-4 pt-3 border-t border-white/8"><span className="text-white">Total</span><span className="text-primary">₹{subtotal.toFixed(2)}</span></div>
              <motion.button
                onClick={() => { onClose(); navigate('/checkout'); }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-full bg-primary text-black font-bold text-sm cursor-pointer border-none transition"
                style={{ boxShadow: '0 0 20px rgba(248,194,0,0.3)' }}
              >
                Proceed to Checkout
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
};

export default CartDrawer;
