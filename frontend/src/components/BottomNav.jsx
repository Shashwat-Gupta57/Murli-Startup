import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/market', label: 'Home', icon: '🏠' },
  { path: '/market', label: 'Market', icon: '🛍️', state: { tab: 'store' } },
  { path: '/market', label: 'Orders', icon: '📦', state: { tab: 'orders' } },
];

const BottomNav = () => {
  const location = useLocation();
  const role = localStorage.getItem('role');

  const allTabs = role === 'retailer'
    ? [{ path: '/dashboard', label: 'Dashboard', icon: '📊' }, ...tabs]
    : tabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-14 bg-bg border-t border-surface2 z-50 flex md:hidden">
      {allTabs.map((t, i) => {
        const isActive = location.pathname === t.path;
        return (
          <Link
            key={i}
            to={t.path}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 no-underline text-[11px] transition
              ${isActive ? 'text-primary' : 'text-text2'}`}
          >
            <span className="text-base">{t.icon}</span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
