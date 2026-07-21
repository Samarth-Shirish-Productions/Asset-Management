import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Boxes,
  ClipboardList,
  Settings,
  LogOut,
  X,
  AlertTriangle,
  UserPlus,
  Building,
  Users,
  User,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Admin', 'Employee'] },
  { name: 'Assets',    path: '/assets',    icon: Boxes,           roles: ['Admin', 'Employee'] },
  { name: 'Requests',  path: '/requests',  icon: ClipboardList,   roles: ['Admin', 'Employee'] },
  // { name: 'Employees', path: '/employees', icon: User, roles: ['Admin'] },
  { name: 'Users', path: '/users', icon: Shield, roles: ['Admin'] },
  { name: 'Organization', path: '/org-setup', icon: Building,    roles: ['Admin'] },
  { name: 'Settings',  path: '/settings',  icon: Settings,        roles: ['Admin', 'Employee'] },
];

/* ── Sign-out confirmation dialog ── */
const SignOutDialog = ({ onConfirm, onCancel }) => (
  <AnimatePresence>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-black/60"
      />
      {/* Card */}
      <motion.div
        key="dialog"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        className="relative w-full max-w-sm z-10 overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-soft)',
        }}
      >
        {/* Top accent line */}
        <div className="h-0.5 w-full" style={{ background: '#ef4444' }} />

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Sign out of AMS?
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                You will be logged out of your current session.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-2 text-xs font-semibold transition-colors"
              style={{
                border: '1px solid var(--border-soft)',
                color: 'var(--text-secondary)',
                background: 'var(--bg-hover)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2 text-xs font-bold text-white transition-colors"
              style={{ background: '#ef4444' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  </AnimatePresence>
);

/* ── Main Sidebar ── */
const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({ 'Participants': true });

  const toggleDropdown = (name) => {
    setOpenDropdowns(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleLogout = async () => {
    setShowConfirm(false);
    await logout();
    navigate('/login');
  };

  const filtered = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="mob-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar shell */}
      <aside
        style={{
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-soft)',
        }}
        className={`
          fixed top-0 bottom-0 left-0 z-40 flex flex-col w-52
          transition-transform duration-250 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* ── Brand header ── */}
        <div
          className="flex items-center justify-between px-4 py-4"
          style={{ borderBottom: '1px solid var(--border-soft)' }}
        >
          <div className="flex items-center gap-2.5">
            {/* Logo box — square but little rounded */}
            <div
              className="w-7 h-7 flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '4px' }}
            >
              <span className="text-white font-black text-xs leading-none">A</span>
            </div>
            <div>
              <span className="font-bold text-xs tracking-wide" style={{ color: 'var(--text-primary)' }}>
                AMS
              </span>
              <p className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>
                v1.0
              </p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="lg:hidden w-6 h-6 flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-0 py-3 overflow-y-auto space-y-0.5">
          {filtered.map(item => {
            const Icon = item.icon;
            
            if (item.children) {
              const isDropdownOpen = openDropdowns[item.name];
              return (
                <div key={item.name}>
                  <button
                    onClick={() => toggleDropdown(item.name)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-all duration-100 border-l-2 border-l-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {item.name}
                    </div>
                    {isDropdownOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-slate-50/50 dark:bg-slate-900/20"
                      >
                        {item.children.map(child => {
                          const ChildIcon = child.icon;
                          return (
                            <NavLink
                              key={child.path}
                              to={child.path}
                              end={child.path === '/participants'}
                              onClick={() => isOpen && toggleSidebar()}
                              className={({ isActive }) =>
                                `flex items-center gap-3 pl-11 pr-4 py-2 text-xs font-medium transition-all duration-100 border-l-2 ${
                                  isActive ? 'nav-active' : 'border-l-transparent'
                                }`
                              }
                              style={({ isActive }) => ({
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                background: isActive ? 'var(--bg-active)' : 'transparent',
                              })}
                              onMouseEnter={e => {
                                if (!e.currentTarget.classList.contains('nav-active')) {
                                  e.currentTarget.style.background = 'var(--bg-hover)';
                                  e.currentTarget.style.color = 'var(--text-primary)';
                                }
                              }}
                              onMouseLeave={e => {
                                if (!e.currentTarget.classList.contains('nav-active')) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = 'var(--text-secondary)';
                                }
                              }}
                            >
                              <ChildIcon className="w-3 h-3 flex-shrink-0 opacity-70" />
                              {child.name}
                            </NavLink>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => isOpen && toggleSidebar()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-100 border-l-2 ${
                    isActive ? 'nav-active' : 'border-l-transparent'
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--bg-active)' : 'transparent',
                })}
                onMouseEnter={e => {
                  if (!e.currentTarget.classList.contains('nav-active')) {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!e.currentTarget.classList.contains('nav-active')) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>


        {/* ── Bottom: Signout ── */}
        <div style={{ borderTop: '1px solid var(--border-soft)' }}>

          <button
            onClick={() => setShowConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#f87171';
              e.currentTarget.style.background = 'rgba(239,68,68,0.06)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogOut className="w-3 h-3 flex-shrink-0" />
            <span>Signout</span>
          </button>

          {/* User info strip */}
          <div
            className="px-4 py-3 flex items-center gap-2.5"
            style={{ borderTop: '1px solid var(--border-soft)' }}
          >
            <div
              className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-white text-[9px] font-black"
              style={{ background: 'var(--accent)', borderRadius: '4px' }}
            >
              {(user?.fullName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold truncate" style={{ color: 'var(--text-secondary)' }}>
                {user?.fullName}
              </p>
              <p className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Sign-out confirmation dialog */}
      {showConfirm && (
        <SignOutDialog
          onConfirm={handleLogout}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
