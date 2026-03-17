import { createBrowserRouter, RouterProvider, Navigate, Outlet, ScrollRestoration, useNavigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { useEffect } from 'react';
import axios from 'axios';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Market from './pages/Market';
import Checkout from './pages/Checkout';
import ProductDetail from './pages/ProductDetail';
import AllReviews from './pages/AllReviews';
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

function RootLayout() {
  const navigate = useNavigate();

  // Background token validation on app load
  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (token) {
      // Ensure both keys are in sync
      localStorage.setItem('token', token);
      localStorage.setItem('authToken', token);
      // Validate token in background
      axios.get(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          // Update stored user with fresh data
          localStorage.setItem('authUser', JSON.stringify(res.data));
          localStorage.setItem('role', res.data.role);
        })
        .catch(err => {
          if (err.response?.status === 401) {
            clearAllAuth();
            navigate('/login');
          }
        });
    }
  }, []);

  return (
    <ToastProvider>
      <CartProvider>
        <ScrollRestoration />
        <Outlet />
      </CartProvider>
    </ToastProvider>
  );
}

// Smart redirect: if user has a valid token, go to their dashboard/market
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
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/market', element: <Market /> },
      { path: '/checkout', element: <Checkout /> },
      { path: '/product/:productId', element: <ProductDetail /> },
      { path: '/product/:productId/reviews', element: <AllReviews /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
