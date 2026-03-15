import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const CartDrawer = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, subtotal, totalItems } = useCart();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-surface z-[70] flex flex-col shadow-2xl animate-[slideIn_0.25s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-lg font-semibold m-0">My Cart <span className="text-text2 text-sm font-normal">({totalItems} items)</span></h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface2 border-none text-text cursor-pointer flex items-center justify-center text-lg hover:bg-border transition">✕</button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="text-center py-12 text-text2">
              <p className="text-4xl mb-3">🛒</p>
              <p className="font-medium">Your cart is empty</p>
              <p className="text-sm mt-1">Browse products and add to cart</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center gap-3 bg-surface2 rounded-xl p-3">
                    <div className="w-16 h-16 rounded bg-surface shrink-0 overflow-hidden relative">
                      {product.image1_url ? (
                        <img src={`${import.meta.env.VITE_UPLOADS_URL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') + '/uploads' : 'http://localhost:5000/uploads')}${product.image1_url.replace(/^\/uploads/, '')}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                      <span className="text-text2 text-xs">No img</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate m-0">{product.name}</p>
                    <p className="text-xs text-text2 m-0 mt-0.5">{product.unit}</p>
                    <p className="text-sm font-bold m-0 mt-1">₹{(parseFloat(product.price) * quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-0 bg-bg rounded-lg overflow-hidden">
                    <button onClick={() => updateQuantity(product.id, quantity - 1)} className="w-8 h-8 border-none bg-transparent text-primary cursor-pointer text-lg font-bold hover:bg-surface2 transition">−</button>
                    <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
                    <button onClick={() => updateQuantity(product.id, quantity + 1)} className="w-8 h-8 border-none bg-transparent text-primary cursor-pointer text-lg font-bold hover:bg-surface2 transition">+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom sticky */}
        {items.length > 0 && (
          <div className="border-t border-border px-5 py-4 bg-surface">
            <div className="flex justify-between text-sm text-text2 mb-1"><span>Subtotal</span><span className="text-text font-medium">₹{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm text-text2 mb-3"><span>Delivery</span><span className="text-text2 text-xs">Add address to calculate</span></div>
            <div className="flex justify-between text-base font-bold mb-4"><span>Total</span><span className="text-primary">₹{subtotal.toFixed(2)}</span></div>
            <button
              onClick={() => { onClose(); navigate('/checkout'); }}
              className="w-full py-3 rounded-lg bg-primary text-bg font-semibold text-sm cursor-pointer border-none hover:bg-primary-hover transition"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </>
  );
};

export default CartDrawer;
