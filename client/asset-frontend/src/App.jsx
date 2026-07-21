import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Requests from './pages/Requests';
import Settings from './pages/Settings';
import PublicScan from './pages/PublicScan';
import Participants from './pages/Participants';
import OrgSetup from './pages/OrgSetup';

// Components
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import api from './services/api';
import Toast from './components/Toast';
import PasswordStrength from './components/PasswordStrength';
import { Eye, EyeOff } from 'lucide-react';

// 1. Route Guards
const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
};

// Guard: Admin-only pages redirect employees to dashboard
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'Admin') return <Navigate to="/dashboard" replace />;
  return children;
};

const PublicRoute = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};

// 2. Shell Layout
const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen flex transition-colors duration-200" style={{ background: 'var(--bg-page)' }}>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col lg:pl-52 min-w-0">
        <Topbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-5 md:p-7 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// 3. Google OAuth Interceptor Page
const OAuthCallback = () => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      loginWithGoogle(token);
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
      <div className="text-center space-y-3">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Authenticating account...</p>
      </div>
    </div>
  );
};

// 4. Email Verification Page
const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [message, setMessage] = useState('Verifying your email address...');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const doVerify = async () => {
      try {
        const res = await api.get(`/auth/verify-email?token=${token}`);
        if (res.data?.success) {
          setStatus('success');
          setMessage(res.data.message || 'Email verified successfully!');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Email verification link invalid or expired.');
      }
    };
    if (token) { doVerify(); } else { setStatus('error'); setMessage('Missing verification token.'); }
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-page)' }}>
      <div
        className="w-full max-w-md p-8 text-center space-y-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}
      >
        <p className="breadcrumb">// VERIFICATION CENTER</p>
        <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Email Verification</h2>
        <p className={`text-sm font-medium ${
          status === 'success' ? 'text-emerald-400' : status === 'error' ? 'text-rose-400' : ''
        }`} style={status === 'loading' ? { color: 'var(--text-muted)' } : {}}>
          {message}
        </p>
        {status !== 'loading' && (
          <button onClick={() => navigate('/login')} className="btn-primary w-full">
            Continue to Login
          </button>
        )}
      </div>
    </div>
  );
};

// 5. Password Reset Pages
const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setToast({ message: res.data.message || 'OTP code sent to email', type: 'success' });
      setTimeout(() => { navigate(`/reset-password?email=${encodeURIComponent(email)}`); }, 2000);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to send OTP code', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      {/* Faded Grid Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />
      <div className="w-full max-w-md p-8 relative z-10" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
        <div className="mb-6">
          <p className="breadcrumb mb-2">// FORGOT PASSWORD</p>
          <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Reset Access</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Enter your email to receive a reset OTP</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" required
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full py-2.5 px-3.5 text-sm"
          />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Sending...' : 'Send Verification OTP'}
          </button>
        </form>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} inline />}
      </div>
    </div>
  );
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState('verify'); // 'verify' or 'reset'
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResendOTP = async () => {
    if (!email) {
      setToast({ message: 'Please provide your email address first', type: 'error' });
      return;
    }
    setResendLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setToast({ message: res.data.message || 'New OTP sent successfully!', type: 'success' });
      setCooldown(30);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to resend OTP', type: 'error' });
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!email || !otp) {
      setToast({ message: 'Please provide both email and OTP', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/verify-reset-otp', { email, otp });
      setToast({ message: 'OTP verified successfully! Please enter your new password.', type: 'success' });
      setStep('reset');
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Verification code invalid or expired', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setToast({ message: 'Please fill in all password fields', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast({ message: 'Passwords do not match', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      setToast({ message: 'Password reset successful!', type: 'success' });
      setTimeout(() => { navigate('/login'); }, 2000);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Password reset failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'var(--bg-page)' }}>
      {/* Faded Grid Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />
      <div 
        className="w-full max-w-md p-8 rounded-2xl transition-all duration-300 relative z-10" 
        style={{ 
          background: 'var(--bg-card)', 
          border: '1.5px solid var(--border-soft)',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        {step === 'verify' ? (
          <div>
            <div className="mb-6">
              <p className="breadcrumb mb-2">// RESET PASSWORD — STEP 1</p>
              <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Verify Identity</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Please verify the 6-digit OTP sent to your email address.
              </p>
            </div>
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Email Address
                </label>
                <input 
                  type="email" 
                  required 
                  placeholder="name@company.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full py-2.5 px-3.5 text-sm rounded-xl outline-none"
                  style={{
                    background: 'var(--bg-page)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  6-Digit OTP Code
                </label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. 123456" 
                  value={otp} 
                  maxLength={6}
                  onChange={(e) => setOtp(e.target.value)} 
                  className="w-full py-2.5 px-3.5 text-sm rounded-xl outline-none text-center font-bold tracking-widest"
                  style={{
                    background: 'var(--bg-page)',
                    border: '1px solid var(--border-soft)',
                    color: 'var(--text-primary)'
                  }}
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendLoading || cooldown > 0}
                    className="text-xs font-semibold hover:underline transition-colors disabled:no-underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{ color: 'var(--text-accent, #6366f1)' }}
                  >
                    {resendLoading ? 'Sending...' : cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP Code'}
                  </button>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                className="btn-primary w-full py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all"
              >
                {loading ? 'Verifying OTP...' : 'Verify OTP Code'}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <p className="breadcrumb mb-2">// RESET PASSWORD — STEP 2</p>
              <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Set New Password</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Your identity was verified. Choose a strong, new password below.
              </p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  New Password
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required 
                    placeholder="Enter new password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="w-full py-2.5 pl-3.5 pr-10 text-sm rounded-xl outline-none"
                    style={{
                      background: 'var(--bg-page)',
                      border: '1px solid var(--border-soft)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 outline-none"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrength password={newPassword} />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Confirm Password
                </label>
                <div className="relative">
                  <input 
                    type={showConfirm ? 'text' : 'password'} 
                    required 
                    placeholder="Confirm new password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className="w-full py-2.5 pl-3.5 pr-10 text-sm rounded-xl outline-none"
                    style={{
                      background: 'var(--bg-page)',
                      border: '1px solid var(--border-soft)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 outline-none"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">Passwords do not match</p>
                )}
                {confirmPassword && newPassword === confirmPassword && (
                  <p className="text-[11px] text-emerald-500 mt-1 font-medium">Passwords match</p>
                )}
              </div>

              <button 
                type="submit" 
                disabled={loading || newPassword !== confirmPassword || !newPassword} 
                className="btn-primary w-full py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          </div>
        )}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} inline />}
      </div>
    </div>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public only routes */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/oauth-callback" element={<OAuthCallback />} />
            </Route>

            {/* Protected internal routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/settings" element={<Settings />} />
              {/* <Route path="/employees" element={<AdminRoute><Participants /></AdminRoute>} /> */}
              <Route path="/users" element={<AdminRoute><Participants /></AdminRoute>} />
              <Route path="/org-setup" element={<AdminRoute><OrgSetup /></AdminRoute>} />
            </Route>

            {/* Public QR auditor landing link */}
            <Route path="/qr/:assetId" element={<PublicScan />} />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
