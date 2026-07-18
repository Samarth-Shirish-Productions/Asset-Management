import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Menu, ShieldAlert, ClipboardCheck, Info, X, Sun, Moon } from 'lucide-react';

/* ── Map route path → breadcrumb label ── */
const routeLabels = {
  '/dashboard':  'Dashboard',
  '/assets':     'Assets',
  '/requests':   'Requests',
  '/add-user':   'People',
  '/org-setup':  'Organization',
  '/settings':   'Settings',
};

const iconMap = {
  warranty:         <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />,
  request:          <ClipboardCheck className="w-3.5 h-3.5 text-blue-400" />,
  'request-update': <Info className="w-3.5 h-3.5 text-emerald-400" />,
};

const Topbar = ({ toggleSidebar }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  const pageLabel = routeLabels[location.pathname] || 'AMS';
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const fetchNotifications = async () => {
    try {
      if (!user) return;
      const alerts = [];
      if (user.role === 'Admin') {
        const dashRes = await api.get('/assets/analytics');
        if (dashRes.data?.success) {
          dashRes.data.expiringWarranties.forEach(a =>
            alerts.push({
              id: `warranty-${a.assetId}`,
              title: 'Warranty Expiring Soon',
              details: `${a.name} (${a.assetId}) expires ${new Date(a.warrantyExpiry).toLocaleDateString()}`,
              type: 'warranty',
            })
          );
        }
        const reqsRes = await api.get('/requests');
        if (reqsRes.data?.success) {
          reqsRes.data.requests
            .filter(r => r.status === 'Pending')
            .forEach(req =>
              alerts.push({
                id: `req-${req._id}`,
                title: 'Pending Request',
                details: `${req.employee?.fullName} — ${req.requestType} for ${req.asset?.name}`,
                type: 'request',
              })
            );
        }
      } else {
        const reqsRes = await api.get('/requests');
        if (reqsRes.data?.success) {
          reqsRes.data.requests
            .filter(r => r.status !== 'Pending')
            .forEach(req =>
              alerts.push({
                id: `req-upd-${req._id}`,
                title: `Request ${req.status}`,
                details: `Your request for ${req.asset?.name} was ${req.status.toLowerCase()}`,
                type: 'request-update',
              })
            );
        }
      }
      setNotifications(alerts);
    } catch (err) {
      console.error('Notification fetch error:', err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(id);
  }, [user]);

  useEffect(() => {
    const handler = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className="glass sticky top-0 z-30 flex items-center justify-between px-5 py-3"
    >
      {/* ── Left: hamburger + breadcrumb ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden w-8 h-8 flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Breadcrumb path */}
        <div>
          <p className="breadcrumb" style={{ color: 'var(--text-muted)' }}>
            // {pageLabel.toUpperCase()}
          </p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
            {pageLabel}
          </p>
        </div>
      </div>

      {/* ── Right: theme toggle + date + notification bell ── */}
      <div className="flex items-center gap-3">

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle theme"
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-soft)',
            color: 'var(--text-secondary)',
          }}
        >
          {theme === 'light' ? (
            <Moon className="w-3.5 h-3.5 text-zinc-500" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          )}
        </button>

        {/* Date */}
        <span className="hidden sm:block mono text-xs" style={{ color: 'var(--text-muted)' }}>
          {today}
        </span>

        {/* Notification bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(v => !v)}
            className="w-8 h-8 flex items-center justify-center relative transition-colors"
            style={{
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-secondary)',
            }}
          >
            <Bell className="w-3.5 h-3.5" />
            {notifications.length > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5"
                style={{ background: '#ef4444' }}
              />
            )}
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 z-50 overflow-hidden"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-soft)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderBottom: '1px solid var(--border-soft)' }}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Notifications
                    </span>
                    {notifications.length > 0 && (
                      <span
                        className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white"
                        style={{ background: 'var(--accent)' }}
                      >
                        {notifications.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="w-5 h-5 flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* Items */}
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="w-6 h-6 mx-auto mb-2 opacity-20" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        All caught up
                      </p>
                    </div>
                  ) : (
                    notifications.map(item => (
                      <div
                        key={item.id}
                        className="flex gap-3 px-4 py-3 cursor-default"
                        style={{ borderBottom: '1px solid var(--border-soft)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center mt-0.5"
                          style={{ background: 'var(--bg-hover)' }}>
                          {iconMap[item.type]}
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {item.title}
                          </p>
                          <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            {item.details}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
