import { createBrowserRouter, RouterProvider, Navigate, Outlet, ScrollRestoration, useNavigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { usePushNotifications } from './hooks/usePushNotifications';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Market from './pages/Market';
import Checkout from './pages/Checkout';
import ProductDetail from './pages/ProductDetail';
import AllReviews from './pages/AllReviews';
import BlobBackground from './components/BlobBackground';
import './index.css';

const API = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000';

function clearAllAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  localStorage.removeItem('role');
  localStorage.removeItem('cartData');
  localStorage.removeItem('selectedDeliveryAddress');
  localStorage.removeItem('selectedCity');
}

const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.25 },
};

function PageWrapper({ children }) {
  return <motion.div {...pageTransition}>{children}</motion.div>;
}

function RootLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('authUser')); } catch { return null; }
  });

  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('authToken', token);
      axios.get(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          localStorage.setItem('authUser', JSON.stringify(res.data));
          localStorage.setItem('role', res.data.role);
          setUser(res.data);
        })
        .catch(err => {
          if (err.response?.status === 401) {
            clearAllAuth();
            setUser(null);
            navigate('/login');
          }
        });
    }
  }, []);

  usePushNotifications(user);

  return (
    <ToastProvider>
      <CartProvider>
        <BlobBackground />
        <ScrollRestoration />
        <Outlet />
      </CartProvider>
    </ToastProvider>
  );
}

function SmartRedirect() {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (token && role) {
    return <Navigate to={role === 'retailer' ? '/dashboard' : '/market'} replace />;
  }
  return <Navigate to="/login" replace />;
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <SmartRedirect /> },
      { path: '/login', element: <PageWrapper><Login /></PageWrapper> },
      { path: '/register', element: <PageWrapper><Register /></PageWrapper> },
      { path: '/dashboard', element: <PageWrapper><Dashboard /></PageWrapper> },
      { path: '/market', element: <PageWrapper><Market /></PageWrapper> },
      { path: '/checkout', element: <PageWrapper><Checkout /></PageWrapper> },
      { path: '/product/:productId', element: <PageWrapper><ProductDetail /></PageWrapper> },
      { path: '/product/:productId/reviews', element: <PageWrapper><AllReviews /></PageWrapper> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
