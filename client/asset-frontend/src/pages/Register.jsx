import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  User, Mail, Lock, Eye, EyeOff,
  Building, MapPin, Check, X, Loader2
} from 'lucide-react';
import PasswordStrength from '../components/PasswordStrength';
import Toast from '../components/Toast';

const DEPARTMENTS = ['IT', 'HR', 'Finance', 'Marketing', 'Design', 'Video Editing', 'Project Management'];
const BRANCHES = ['Pune', 'Bangalore', 'Hyderabad', 'Mumbai'];

const Label = ({ children }) => (
  <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
    {children}
  </label>
);

const IconInput = ({ icon: Icon, children }) => (
  <div className="relative">
    <Icon className="absolute left-3.5 top-3.5 w-4.5 h-4.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
    {children}
  </div>
);

const inputCls = "w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none";
const selectCls = "w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium outline-none appearance-none";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('IT');
  const [branch, setBranch] = useState('Pune');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setPasswordsMatch(!confirmPassword || password === confirmPassword);
  }, [password, confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setToast({ message: 'Passwords do not match', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await register(fullName, email, password, department, branch);
      setToast({ message: res.message || 'Account created — check your email to verify.', type: 'success', duration: 8000 });
      setFullName(''); setEmail(''); setPassword(''); setConfirmPassword('');
    } catch (err) {
      setToast({ message: err || 'Registration failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-bg min-h-screen flex items-center justify-center p-4 transition-colors duration-300">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.35), transparent)' }} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.25), transparent)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative w-full max-w-2xl rounded-3xl overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border-soft)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Accent top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

        <div className="p-8">
          {/* Brand header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-500/25 mb-4">
              A
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Create an Account
            </h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Register as an Employee to manage your assigned assets.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <IconInput icon={User}>
                  <input
                    type="text" required
                    placeholder="John Doe"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className={inputCls}
                  />
                </IconInput>
              </div>
              <div>
                <Label>Email Address</Label>
                <IconInput icon={Mail}>
                  <input
                    type="email" required
                    placeholder="name@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={inputCls}
                  />
                </IconInput>
              </div>
            </div>

            {/* Row 2: Department + Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Department</Label>
                <IconInput icon={Building}>
                  <select
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className={selectCls}
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </IconInput>
              </div>
              <div>
                <Label>Office Location</Label>
                <IconInput icon={MapPin}>
                  <select
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                    className={selectCls}
                  >
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </IconInput>
              </div>
            </div>

            {/* Row 3: Password + Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password */}
              <div>
                <Label>Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4.5 h-4.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    placeholder="••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`${inputCls} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3.5 top-3.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPass ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>

              {/* Confirm Password */}
              <div>
                <Label>Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4.5 h-4.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    placeholder="••••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={{
                      borderColor: confirmPassword
                        ? passwordsMatch ? '#22c55e' : '#ef4444'
                        : undefined,
                      boxShadow: confirmPassword
                        ? passwordsMatch ? '0 0 0 3px rgba(34,197,94,0.12)' : '0 0 0 3px rgba(239,68,68,0.12)'
                        : undefined,
                    }}
                    className={`${inputCls} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3.5 top-3.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showConfirm ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>

                {/* Match indicator */}
                {confirmPassword && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold">
                    {passwordsMatch ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Passwords match</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-rose-500">Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !passwordsMatch}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Account
            </button>
          </form>

          <p className="text-center text-sm mt-7" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-bold transition-colors" style={{ color: 'var(--accent)' }}>
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} duration={toast.duration} />
      )}
    </div>
  );
};

export default Register;
