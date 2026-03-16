import { createBrowserRouter, RouterProvider, Navigate, Outlet, ScrollRestoration } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Market from './pages/Market';
import Checkout from './pages/Checkout';
import ProductDetail from './pages/ProductDetail';
import AllReviews from './pages/AllReviews';
import './index.css';

function RootLayout() {
  return (
    <ToastProvider>
      <CartProvider>
        <ScrollRestoration />
        <Outlet />
      </CartProvider>
    </ToastProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <Navigate to="/login" replace /> },
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
