import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  Mail, Lock, Eye, EyeOff,
  Fingerprint, ShieldCheck, Loader2, ArrowRight
} from 'lucide-react';
import Toast from '../components/Toast';

/* Google icon */
const GoogleIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

/* Microsoft icon */
const MicrosoftIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 21 21" aria-hidden="true">
    <path fill="#f25022" d="M1 1h9v9H1z"/>
    <path fill="#00a4ef" d="M1 11h9v9H1z"/>
    <path fill="#7fba00" d="M11 1h9v9h-9z"/>
    <path fill="#ffb900" d="M11 11h9v9h-9z"/>
  </svg>
);

/* GitHub icon */
const GithubIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const dailyQuotes = [
  "An asset is only as valuable as the maintenance it receives.",
  "Track everything. Assume nothing. Manage better.",
  "Effective asset management transforms operational chaos into strategic clarity.",
  "Hardware is temporary, but accurate tracking is forever.",
  "If you can't measure it, you can't manage it.",
  "A well-maintained asset is a business's silent partner.",
  "Protect your investments through diligent tracking."
];

const Login = () => {
  const { login, loginWith2FA, loginWithPasskey } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentQuote = dailyQuotes[new Date().getDate() % dailyQuotes.length];

  React.useEffect(() => {
    if (searchParams.get('error') === 'unauthorized') {
      setToast({ message: 'Access Denied: Account not registered.', type: 'error' });
      setSearchParams(new URLSearchParams());
    }
  }, [searchParams, setSearchParams]);

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [require2FA, setRequire2FA]     = useState(false);
  const [twoFAToken, setTwoFAToken]     = useState('');
  const [userId2FA, setUserId2FA]       = useState('');
  const [toast, setToast]               = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.require2FA) {
        setRequire2FA(true);
        setUserId2FA(res.userId);
        setToast({ message: '2FA required — enter your authenticator code.', type: 'info' });
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setToast({ message: err || 'Invalid credentials', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    if (twoFAToken.length !== 6) {
      setToast({ message: 'Enter a valid 6-digit code', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await loginWith2FA(userId2FA, twoFAToken);
      navigate('/dashboard');
    } catch (err) {
      setToast({ message: err || 'Invalid 2FA token', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setLoading(true);
    try {
      await loginWithPasskey();
      navigate('/dashboard');
    } catch (err) {
      setToast({ message: err || 'Passkey authentication failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/google`;
  };

  const handleMicrosoftLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/microsoft`;
  };

  const handleGithubLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/github`;
  };

  /* input base class */
  const inputCls = 'w-full pl-9 pr-4 py-2.5 text-sm font-medium outline-none';

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--bg-page)' }}
    >
      {/* ═══════════ LEFT HERO PANEL ═══════════ */}
      <div
        className="hidden lg:flex flex-col justify-between w-[55%] p-10 relative overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-soft)',
        }}
      >
        {/* Faded Grid Background */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(148, 163, 184, 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148, 163, 184, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
            WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
            maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
          }}
        />

        {/* Top: logo */}
        <div className="relative z-10 flex items-center gap-2">
          <div
            className="w-6 h-6 flex items-center justify-center"
            style={{ background: 'var(--accent)' }}
          >
            <span className="text-white font-black text-[10px]">A</span>
          </div>
          <span className="mono text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            AMS / v1.0
          </span>
        </div>

        {/* Center: hero text */}
        <div className="relative z-10 space-y-4">
          <p className="breadcrumb" style={{ color: 'var(--text-muted)' }}>
            // ASSET MANAGEMENT SYSTEM
          </p>
          <h1
            className="text-5xl font-black leading-[1.05] tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Every asset.<br />
            <span style={{ color: 'var(--accent)' }}>Accounted for.</span>
          </h1>
          <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'var(--text-secondary)' }}>
            A precision tool for tracking hardware, software, furniture and
            vehicles across branches — with QR codes, warranty alerts
            and live analytics.
          </p>
        </div>

        {/* Bottom: Daily Quote */}
        <div className="relative z-10 mt-8">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--accent)' }}>
            Quote of the Day
          </p>
          <p className="text-sm font-medium italic leading-relaxed max-w-sm" style={{ color: 'var(--text-secondary)' }}>
            "{currentQuote}"
          </p>
        </div>
      </div>

      {/* ═══════════ RIGHT FORM PANEL ═══════════ */}
      <div
        className="flex flex-col justify-center w-full lg:w-[45%] p-8 lg:p-12"
        style={{ background: 'var(--bg-page)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full max-w-md mx-auto p-8 sm:p-10 card relative"
        >
          {/* Optional top accent line for the card */}
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'var(--accent)' }} />
          {/* Breadcrumb */}
          <p className="breadcrumb mb-6" style={{ color: 'var(--text-muted)' }}>
            // {require2FA ? 'TWO-FACTOR AUTH' : 'LOGIN'}
          </p>

          {/* Title */}
          <h2
            className="text-2xl font-black tracking-tight mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {require2FA ? 'Verify Identity' : 'Login'}
          </h2>
          <p className="text-xs mb-7" style={{ color: 'var(--text-muted)' }}>
            {require2FA
              ? 'Enter the 6-digit code from your authenticator app.'
              : 'Use your active credentials or contact admin.'}
          </p>

          {/* ── 2FA Form ── */}
          {require2FA ? (
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div>
                <label className="field-label">Authenticator Code</label>
                <div className="relative flex items-center">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={twoFAToken}
                    onChange={e => setTwoFAToken(e.target.value.replace(/\D/g, ''))}
                    className={`${inputCls} text-center tracking-[10px] text-lg font-black`}
                  />
                </div>
              </div>
              <button type="submit" disabled={loading || twoFAToken.length !== 6} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Verify Code
              </button>
              <button type="button" onClick={() => { setRequire2FA(false); setTwoFAToken(''); }}
                className="w-full py-2.5 text-xs font-medium transition-colors"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-hover)', border: '1px solid var(--border-soft)' }}>
                ← Go Back
              </button>
            </form>
          ) : (
            /* ── Standard Login Form ── */
            <>
              {/* Social auth */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  className="col-span-2 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors"
                  style={{
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-input)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <Fingerprint className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  Passkey
                </button>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors"
                  style={{
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-input)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <GoogleIcon />
                  Google
                </button>
                <button
                  type="button"
                  onClick={handleMicrosoftLogin}
                  className="flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors"
                  style={{
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-input)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <MicrosoftIcon />
                  Microsoft
                </button>
                {/* <button
                  type="button"
                  onClick={handleGithubLogin}
                  className="col-span-2 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors"
                  style={{
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-input)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-soft)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <GithubIcon />
                  GitHub
                </button> */}
              </div>

              {/* Divider */}
              <div className="relative my-5 flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'var(--border-soft)' }} />
                <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  or
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--border-soft)' }} />
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="field-label">Email</label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      required
                      placeholder="admin@ams.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="field-label" style={{ marginBottom: 0 }}>Password</label>
                    <Link
                      to="/forgot-password"
                      className="text-[10px] font-semibold"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className={`${inputCls} pr-9`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                >
                  {loading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <ArrowRight className="w-3.5 h-3.5" />
                  }
                  Enter Dashboard
                </button>
              </form>
            </>
          )}
          {toast && (
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} inline />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
