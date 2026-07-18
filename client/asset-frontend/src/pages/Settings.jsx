import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { startRegistration } from '@simplewebauthn/browser';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import { 
  User, 
  MapPin, 
  Building, 
  Fingerprint, 
  ShieldCheck, 
  ShieldX,
  History,
  Info,
  Loader2
} from 'lucide-react';

const Settings = () => {
  const { user, updateProfile, checkAuth } = useAuth();
  
  // Profile Form States
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [branch, setBranch] = useState('');
  
  // 2FA Setup states
  const [twoFAQrCode, setTwoFAQrCode] = useState('');
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFAToken, setTwoFAToken] = useState('');
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  
  // States
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [toast, setToast] = useState(null);

  // Constants
  const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Design', 'Video Editing', 'Project Management'];
  const branches = ['Pune', 'Bangalore', 'Hyderabad', 'Mumbai'];

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setDepartment(user.department || '');
      setBranch(user.branch || '');
      fetchLoginActivity();
    }
  }, [user]);

  // Fetch user logs
  const fetchLoginActivity = async () => {
    try {
      const res = await api.get('/auth/login-activity');
      if (res.data?.success) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  // Save Profile Info
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({ fullName, department, branch });
      setToast({ message: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      setToast({ message: err || 'Update failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Register WebAuthn Passkey
  const handleRegisterPasskey = async () => {
    try {
      // 1. Fetch options from backend
      const optionsRes = await api.get('/auth/passkey/register-options');
      const options = optionsRes.data;

      // 2. Register credential in browser
      const credential = await startRegistration(options);

      // 3. Verify with backend
      const verifyRes = await api.post('/auth/passkey/register-verify', credential);
      
      if (verifyRes.data?.success) {
        setToast({ message: 'Biometric Passkey registered successfully!', type: 'success' });
        checkAuth(); // update context user hasPasskey flag
      }
    } catch (err) {
      console.error(err);
      setToast({ message: err.response?.data?.message || err.message || 'Passkey registration failed', type: 'error' });
    }
  };

  // Setup TOTP 2FA (Open setup modal)
  const handleSetup2FA = async () => {
    try {
      const res = await api.post('/auth/2fa/setup');
      if (res.data?.success) {
        setTwoFAQrCode(res.data.qrCode);
        setTwoFASecret(res.data.secret);
        setTwoFAToken('');
        setIs2FAModalOpen(true);
      }
    } catch (err) {
      setToast({ message: 'Failed to initiate 2FA setup', type: 'error' });
    }
  };

  // Verify and enable 2FA
  const handleVerifyEnable2FA = async (e) => {
    e.preventDefault();
    if (!twoFAToken || twoFAToken.length !== 6) {
      setToast({ message: 'Enter a valid 6-digit code', type: 'error' });
      return;
    }
    try {
      const res = await api.post('/auth/2fa/verify', { token: twoFAToken });
      if (res.data?.success) {
        setToast({ message: '2FA enabled successfully!', type: 'success' });
        setIs2FAModalOpen(false);
        checkAuth();
      }
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Invalid code', type: 'error' });
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable 2FA security?')) return;
    try {
      const res = await api.post('/auth/2fa/disable');
      if (res.data?.success) {
        setToast({ message: '2FA disabled successfully', type: 'success' });
        checkAuth();
      }
    } catch (err) {
      setToast({ message: 'Failed to disable 2FA', type: 'error' });
    }
  };

  return (
    <div className="page-container space-y-6 max-w-4xl">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile & Settings</h1>
          <p className="page-subtitle">Customize profile details and manage secure multi-factor options.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Details Edit Card */}
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>Edit Profile</h3>
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text" required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900 focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Department</label>
              <div className="relative">
                <Building className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded appearance-none bg-slate-50 dark:bg-slate-900 focus:border-[var(--accent)]"
                >
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Branch Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded appearance-none bg-slate-50 dark:bg-slate-900 focus:border-[var(--accent)]"
                >
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Profile Info
            </button>
          </form>
        </div>

        {/* Security & MFA Card */}
        <div className="card p-6 space-y-6">
          <h3 className="font-bold text-sm uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Multifactor Protections</h3>
          
          {/* WebAuthn Passkeys setting */}
          <div className="flex items-start justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
            <div className="space-y-1 pr-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                <Fingerprint className="w-4.5 h-4.5 text-indigo-500" />
                Biometric Passkeys (WebAuthn)
              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Log in passwordless using device fingerprint, FaceID, or physical security keys.
              </p>
            </div>
            <button
              onClick={handleRegisterPasskey}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded text-[10px] transition-colors"
            >
              {user?.hasPasskey ? 'Add Passkey' : 'Register Key'}
            </button>
          </div>

          {/* 2FA TOTP setting */}
          <div className="flex items-start justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
            <div className="space-y-1 pr-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                {user?.twoFactorEnabled ? (
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" />
                ) : (
                  <ShieldX className="w-4.5 h-4.5 text-rose-500" />
                )}
                TOTP Authenticator (2FA)
              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Secure your login details with Google Authenticator or Authy 6-digit dynamic codes.
              </p>
            </div>
            {user?.twoFactorEnabled ? (
              <button
                onClick={handleDisable2FA}
                className="px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded text-[10px] transition-colors"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                onClick={handleSetup2FA}
                className="btn-primary px-3 py-2 text-[10px]"
              >
                Setup 2FA
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Login History Activities Logs */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-6">
          <History className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Device Login Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-850/40 text-left text-[11px] font-semibold">
            <thead className="bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 uppercase font-bold">
              <tr>
                <th className="px-5 py-3.5 rounded-l-xl">Timestamp</th>
                <th className="px-5 py-3.5">Method</th>
                <th className="px-5 py-3.5">IP Address</th>
                <th className="px-5 py-3.5 rounded-r-xl">Client Browser Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850/40 text-slate-650 dark:text-slate-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400 font-bold">No active logs recorded.</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log._id}>
                    <td className="px-5 py-3">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        log.type === 'Passkey' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-500/10 text-slate-500'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono">{log.ip}</td>
                    <td className="px-5 py-3 truncate max-w-[200px]" title={log.device}>{log.device}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      <Modal
        isOpen={is2FAModalOpen}
        onClose={() => setIs2FAModalOpen(false)}
        title="Configuring 2FA Security"
        size="sm"
      >
        <form onSubmit={handleVerifyEnable2FA} className="space-y-4 font-sans text-xs text-center">
          <p className="text-slate-500 leading-relaxed text-left">
            1. Scan the following QR code using Google Authenticator, Authy or your preferred authenticator tool.
          </p>
          
          <div className="flex justify-center my-4">
            <div className="p-2.5 border border-slate-200 dark:border-slate-800 bg-white rounded-xl shadow-inner">
              <img src={twoFAQrCode} alt="2FA Setup QR" className="w-44 h-44" />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 p-3 rounded-xl text-left font-mono text-[10px] select-all">
            <span className="font-bold text-slate-400 block uppercase mb-1">Backup Key</span>
            {twoFASecret}
          </div>

          <p className="text-slate-500 leading-relaxed text-left mt-4">
            2. Scan completed? Enter the 6-digit code generated by the app to verify setup.
          </p>

          <input
            type="text"
            required
            maxLength={6}
            placeholder="000000"
            value={twoFAToken}
            onChange={(e) => setTwoFAToken(e.target.value.replace(/\D/g, ''))}
            className="w-full py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-lg font-black tracking-[8px] bg-slate-50 dark:bg-slate-950/20"
          />

          <button
            type="submit"
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-colors"
          >
            Verify & Activate 2FA
          </button>
        </form>
      </Modal>

      {/* Global Toast Panel */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Settings;
