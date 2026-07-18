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
import AddUser from './pages/AddUser';
import OrgSetup from './pages/OrgSetup';

// Components
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import api from './services/api';
import Toast from './components/Toast';

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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-page)' }}>
      <div className="w-full max-w-md p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
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
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
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
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      setToast({ message: 'Password reset successful!', type: 'success' });
      setTimeout(() => { navigate('/login'); }, 2500);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Verification code failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-page)' }}>
      <div className="w-full max-w-md p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
        <div className="mb-6">
          <p className="breadcrumb mb-2">// RESET PASSWORD</p>
          <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>New Password</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Enter OTP verification code sent to email</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" required placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full py-2.5 px-3.5 text-sm" />
          <input type="text" required placeholder="6-Digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full py-2.5 px-3.5 text-sm text-center font-bold tracking-widest" />
          <input type="password" required placeholder="Enter New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full py-2.5 px-3.5 text-sm" />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Processing...' : 'Reset Password'}
          </button>
        </form>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
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
              <Route path="/add-user" element={<AdminRoute><AddUser /></AdminRoute>} />
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
