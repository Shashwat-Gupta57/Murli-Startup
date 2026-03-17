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
    <nav
      className="fixed z-[1000] flex md:hidden items-center px-2 py-1"
      style={{ bottom: 24, left: '50%', transform: 'translateX(-50%)', width: 'fit-content', gap: 4, background: '#0C0C0C', borderTop: '1px solid #2A2A2A', borderRadius: 24 }}
    >
      {allTabs.map((t, i) => {
        const isActive = location.pathname === t.path;
        return (
          <Link
            key={i}
            to={t.path}
            className="flex flex-col items-center justify-center no-underline transition px-3 py-1.5 rounded-full"
            style={{
              color: isActive ? '#F8C200' : 'rgba(255,255,255,0.4)',
              background: isActive ? 'rgba(248,194,0,0.1)' : 'transparent',
              minWidth: 56,
            }}
          >
            <span className="text-base">{t.icon}</span>
            <span className="text-[10px] font-medium">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
