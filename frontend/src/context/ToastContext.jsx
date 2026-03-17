import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastCtx = createContext();
export const useToast = () => useContext(ToastCtx);

const borderColors = {
  success: '#1DBF73',
  error: '#FF4D4D',
  warning: '#F8C200',
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const showToast = useCallback((message, type = 'success') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto px-5 py-3 rounded-xl text-sm animate-[slideUp_0.3s_ease-out]"
            style={{
              background: 'rgba(15, 15, 25, 0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderLeft: `4px solid ${borderColors[t.type] || borderColors.success}`,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
              color: '#FFFFFF',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </ToastCtx.Provider>
  );
};
