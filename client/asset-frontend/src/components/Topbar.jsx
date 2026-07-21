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
  warranty:         <ShieldAlert className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />,
  request:          <ClipboardCheck className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />,
  'request-update': <Info className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />,
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
      className="sticky top-0 z-30 flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 transition-colors duration-200"
    >
      {/* ── Left: hamburger + breadcrumb ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded transition-colors bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Breadcrumb path */}
        <div>
          <p className="text-[10px] tracking-wider font-mono text-slate-400 dark:text-zinc-500 uppercase">
            // {pageLabel.toUpperCase()}
          </p>
          <p className="text-sm font-semibold mt-0.5 text-slate-700 dark:text-zinc-200">
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
          className="w-8 h-8 flex items-center justify-center rounded transition-colors border border-slate-200 dark:border-zinc-800 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400"
        >
          {theme === 'light' ? (
            <Moon className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          )}
        </button>

        {/* Date */}
        <span className="hidden sm:block font-mono text-xs text-slate-400 dark:text-zinc-500">
          {today}
        </span>

        {/* Notification bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(v => !v)}
            className="w-8 h-8 flex items-center justify-center rounded relative transition-colors border border-slate-200 dark:border-zinc-800 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400"
          >
            <Bell className="w-3.5 h-3.5" />
            {notifications.length > 0 && (
              <span
                className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
              />
            )}
          </button>

          {/* Dropdown menu */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 z-50 overflow-hidden rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl"
              >
                {/* Dropdown Header */}
                <div
                  className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950"
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                      Notifications
                    </span>
                    {notifications.length > 0 && (
                      <span
                        className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white dark:text-zinc-950 rounded-full bg-blue-600 dark:bg-amber-400"
                      >
                        {notifications.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="w-5 h-5 flex items-center justify-center text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* Items wrapper */}
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/50">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="w-6 h-6 mx-auto mb-2 opacity-20 text-slate-400 dark:text-zinc-400" />
                      <p className="text-xs font-medium text-slate-400 dark:text-zinc-500">
                        All caught up
                      </p>
                    </div>
                  ) : (
                    notifications.map(item => (
                      <div
                        key={item.id}
                        className="flex gap-3 px-4 py-3 cursor-default transition-colors bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                      >
                        <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center mt-0.5 rounded bg-slate-100 dark:bg-zinc-950">
                          {iconMap[item.type]}
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="text-xs font-semibold truncate text-slate-700 dark:text-zinc-200">
                            {item.title}
                          </p>
                          <p className="text-[10px] mt-0.5 leading-relaxed text-slate-500 dark:text-zinc-400">
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