import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, AreaChart, Area
} from 'recharts';
import {
  Boxes, Archive, HeartHandshake, Wrench,
  AlertTriangle, CalendarClock, History,
  TrendingUp, CheckCircle2, Clock, PackageX,
  DollarSign
} from 'lucide-react';
import { motion } from 'framer-motion';
import Toast from '../components/Toast';

/* ─────────────────────────────────────────────────────────────
   Palette
───────────────────────────────────────────────────────────── */
const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'];
const BAR_GRADIENT = [
  { id: 'dept', from: '#818cf8', to: '#6366f1' },
  { id: 'branch', from: '#34d399', to: '#059669' },
];

/* ─────────────────────────────────────────────────────────────
   Custom Recharts Tooltip
───────────────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label, dark }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-2xl px-4 py-3 shadow-xl text-sm"
      style={{
        background: dark ? '#1e2535' : '#ffffff',
        border: `1.5px solid ${dark ? '#2a3449' : '#e4e8f0'}`,
        color: dark ? '#f1f5f9' : '#0f172a',
        minWidth: 130,
      }}
    >
      {label && (
        <p className="text-[11px] font-bold uppercase tracking-widest mb-1.5"
          style={{ color: dark ? '#64748b' : '#94a3b8' }}>
          {label}
        </p>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: dark ? '#94a3b8' : '#64748b' }}>
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: p.fill || p.color }} />
            {p.name || p.dataKey}
          </span>
          <span className="text-sm font-black">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* Custom donut center label */
const DonutLabel = ({ viewBox, total }) => {
  if (!viewBox || viewBox.cx == null || viewBox.cy == null) return null;
  const { cx, cy } = viewBox;
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 28, fontWeight: 900, fill: 'var(--text-primary)' }}>
        {total}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 11, fontWeight: 700, fill: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2 }}>
        ASSETS
      </text>
    </g>
  );
};

/* ─────────────────────────────────────────────────────────────
   Animated stat card
───────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, icon: Icon, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    className="stat-card relative overflow-hidden group flex flex-col justify-between h-full"
    style={{ borderLeft: `3px solid ${color}` }}
  >
    <div className="flex justify-between items-start mb-2">
      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
      <Icon className="w-4 h-4 opacity-40" style={{ color }} />
    </div>
    <div className="flex items-baseline gap-2 mt-1">
      <p className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
        {value ?? '—'}
      </p>
    </div>
    {/* Subtle hover gradient background */}
    <div 
      className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
      style={{ background: `linear-gradient(45deg, ${color}22, transparent)` }} 
    />
  </motion.div>
);

/* Chart container card */
const ChartCard = ({ title, icon: Icon, iconColor, children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className={`card p-6 ${className}`}
  >
    <div className="flex items-center gap-2.5 mb-6">
      {Icon && (
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${iconColor}1a` }}>
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
      )}
      <h3 className="text-xs font-extrabold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
        {title}
      </h3>
    </div>
    {children}
  </motion.div>
);

/* SVG gradient defs helper */
const GradientDefs = () => (
  <defs>
    {BAR_GRADIENT.map(g => (
      <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={g.from} stopOpacity={1} />
        <stop offset="95%" stopColor={g.to} stopOpacity={0.85} />
      </linearGradient>
    ))}
    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
    </linearGradient>
  </defs>
);

/* ─────────────────────────────────────────────────────────────
   Main Dashboard component
───────────────────────────────────────────────────────────── */
const Dashboard = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [data, setData] = useState(null);
  const [employeeData, setEmployeeData] = useState({ assets: [], requests: [] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const axisColor = dark ? '#334155' : '#e2e8f0';
  const tickColor = dark ? '#64748b' : '#94a3b8';

  const fetchAdminAnalytics = async () => {
    try {
      const res = await api.get('/assets/analytics');
      if (res.data?.success) setData(res.data);
    } catch (err) {
      setToast({ message: err.message || 'Failed to fetch analytics', type: 'error' });
    }
  };

  const fetchEmployeeSummary = async () => {
    try {
      const [assetsRes, reqsRes] = await Promise.all([
        api.get('/assets/my'),
        api.get('/requests'),
      ]);
      if (assetsRes.data?.success && reqsRes.data?.success) {
        setEmployeeData({ assets: assetsRes.data.assets, requests: reqsRes.data.requests });
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to fetch your assets', type: 'error' });
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      user.role === 'Admin' ? await fetchAdminAnalytics() : await fetchEmployeeSummary();
      setLoading(false);
    })();
  }, [user]);

  /* ── Loading state ── */
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[72vh] gap-3">
      <div className="w-10 h-10 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Compiling analytics…</p>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     ADMIN DASHBOARD
  ═══════════════════════════════════════════════════════════ */
  if (user?.role === 'Admin' && data) {
    const { metrics, statusData, branchData, departmentData, expiringWarranties, activityFeed } = data;
    const totalAssets = metrics.totalAssets;
    const nonZeroStatus = statusData.filter(d => d.value > 0);

    /* Mock sparkline data (replace with real time-series if available) */
    const sparkData = [
      { m: 'Jan', v: Math.max(1, totalAssets - 18) },
      { m: 'Feb', v: Math.max(1, totalAssets - 14) },
      { m: 'Mar', v: Math.max(1, totalAssets - 9) },
      { m: 'Apr', v: Math.max(1, totalAssets - 5) },
      { m: 'May', v: Math.max(1, totalAssets - 2) },
      { m: 'Jun', v: totalAssets },
    ];

    return (
      <div className="page-container space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title">Good morning, {user?.fullName?.split(' ')[0] || 'Admin'}</h1>
            <p className="page-subtitle">Overview of your asset ecosystem</p>
          </div>
          <div className="text-right hidden sm:block">
            <span className="badge-active bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-md text-xs font-bold border border-emerald-500/20">
              System Administrator
            </span>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Assets', value: metrics.totalAssets, icon: Boxes, color: '#6366f1' },
            { label: 'Deployed', value: metrics.active, icon: HeartHandshake, color: '#22c55e' },
            { label: 'In Storage', value: metrics.inStorage, icon: Archive, color: '#3b82f6' },
            { label: 'In Repair', value: metrics.inRepair, icon: Wrench, color: '#f59e0b' },
            { label: 'Lost / Damaged', value: metrics.damaged, icon: AlertTriangle, color: '#ef4444' },
          ].map((card, i) => (
            <StatCard key={card.label} {...card} delay={i * 0.05} />
          ))}
        </div>

        {/* ── Main Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Donut — Status Breakdown */}
          <ChartCard title="Status Breakdown" icon={TrendingUp} iconColor="#6366f1">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <GradientDefs />
                  <Pie
                    data={nonZeroStatus}
                    cx="50%" cy="46%"
                    innerRadius={68} outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    labelLine={false}
                  >
                    {nonZeroStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                    <DonutLabel total={totalAssets} />
                  </Pie>
                  <Tooltip
                    content={<CustomTooltip dark={dark} />}
                    cursor={false}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 justify-center">
              {nonZeroStatus.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[11px] font-semibold"
                  style={{ color: 'var(--text-secondary)' }}>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                  {d.name} <span className="font-black" style={{ color: 'var(--text-primary)' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Department Bar Chart */}
          <ChartCard title="By Department" icon={Boxes} iconColor="#3b82f6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} barSize={20} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <GradientDefs />
                  <CartesianGrid vertical={false} stroke={axisColor} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name" tick={{ fill: tickColor, fontSize: 10, fontWeight: 700 }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: tickColor, fontSize: 10, fontWeight: 600 }}
                    axisLine={false} tickLine={false} allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip dark={dark} />} cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', radius: 8 }} />
                  <Bar dataKey="value" name="Assets" fill="url(#dept)" radius={[8, 8, 3, 3]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Branch Bar Chart */}
          <ChartCard title="By Branch" icon={Archive} iconColor="#22c55e">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchData} barSize={22} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <GradientDefs />
                  <CartesianGrid vertical={false} stroke={axisColor} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name" tick={{ fill: tickColor, fontSize: 10, fontWeight: 700 }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: tickColor, fontSize: 10, fontWeight: 600 }}
                    axisLine={false} tickLine={false} allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip dark={dark} />} cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', radius: 8 }} />
                  <Bar dataKey="value" name="Assets" fill="url(#branch)" radius={[8, 8, 3, 3]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* ── Growth Sparkline + Feed row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Area chart — Asset growth */}
          <ChartCard title="Asset Growth (6 Months)" icon={TrendingUp} iconColor="#6366f1" className="lg:col-span-2">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <GradientDefs />
                  <CartesianGrid vertical={false} stroke={axisColor} strokeDasharray="3 3" />
                  <XAxis dataKey="m" tick={{ fill: tickColor, fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: tickColor, fontSize: 10, fontWeight: 600 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip dark={dark} />} />
                  <Area
                    type="monotone" dataKey="v" name="Total"
                    stroke="#6366f1" strokeWidth={2.5}
                    fill="url(#areaFill)"
                    dot={{ fill: '#6366f1', r: 4, strokeWidth: 2, stroke: dark ? '#1e2535' : '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Warranty Expirations */}
          <ChartCard title="Warranty Expirations (60 days)" icon={CalendarClock} iconColor="#f59e0b" className="lg:col-span-3">
            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              {expiringWarranties.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-60" />
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    No warranties expiring soon
                  </p>
                </div>
              ) : (
                expiringWarranties.map(asset => {
                  const daysLeft = Math.ceil((new Date(asset.warrantyExpiry) - Date.now()) / 86400000);
                  const urgent = daysLeft <= 14;
                  return (
                    <div
                      key={asset.assetId}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl transition-colors"
                      style={{ background: 'var(--bg-hover)', border: '1.5px solid var(--border-soft)' }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: urgent ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)' }}>
                          <CalendarClock className="w-4 h-4" style={{ color: urgent ? '#ef4444' : '#f59e0b' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{asset.name}</p>
                          <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                            {asset.assetId} · {asset.vendor || 'Unknown vendor'}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                        style={{
                          background: urgent ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                          color: urgent ? '#ef4444' : '#f59e0b',
                        }}
                      >
                        {daysLeft}d left
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </ChartCard>
        </div>

        {/* ── Audit Log ── */}
        <ChartCard title="System Audit Log" icon={History} iconColor="#a855f7">
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {activityFeed.length === 0 ? (
              <p className="text-center text-xs font-semibold py-8" style={{ color: 'var(--text-muted)' }}>
                No logged actions recorded yet.
              </p>
            ) : (
              activityFeed.map((act, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div className="w-7 h-7 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <History className="w-3.5 h-3.5 text-violet-500" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                      <span className="font-black">{act.performedBy}</span>{' '}{act.details}
                    </p>
                    <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {act.name} · {act.assetId} · {new Date(act.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ChartCard>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     EMPLOYEE DASHBOARD
  ═══════════════════════════════════════════════════════════ */
  const { assets, requests } = employeeData;
  const pending = requests.filter(r => r.status === 'Pending').length;
  const approved = requests.filter(r => r.status === 'Approved').length;

  /* Mini donut for employee */
  const empStatusData = [
    { name: 'Active', value: assets.filter(a => a.status === 'Active').length },
    { name: 'Other', value: assets.filter(a => a.status !== 'Active').length },
  ].filter(d => d.value > 0);

  return (
    <div className="page-container space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.fullName?.split(' ')[0] || 'User'}</h1>
          <p className="page-subtitle">{user?.department} Department · {user?.branch} Branch</p>
        </div>
        <div className="text-right hidden sm:block">
          <span className="badge-active bg-indigo-500/10 text-indigo-500 px-3 py-1.5 rounded-md text-xs font-bold border border-indigo-500/20">
            {user?.role}
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'My Assets', value: assets.length, icon: Boxes, color: '#6366f1' },
          { label: 'Active Assets', value: assets.filter(a => a.status === 'Active').length, icon: CheckCircle2, color: '#22c55e' },
          { label: 'Pending Requests', value: pending, icon: Clock, color: '#f59e0b' },
          { label: 'Approved', value: approved, icon: HeartHandshake, color: '#3b82f6' },
        ].map((c, i) => <StatCard key={c.label} {...c} delay={i * 0.07} />)}
      </div>

      {/* Asset list + mini donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Donut summary */}
        {empStatusData.length > 0 && (
          <ChartCard title="Asset Status" icon={TrendingUp} iconColor="#6366f1">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <GradientDefs />
                  <Pie
                    data={empStatusData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {empStatusData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                    <DonutLabel total={assets.length} />
                  </Pie>
                  <Tooltip content={<CustomTooltip dark={dark} />} cursor={false} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-5 mt-2">
              {empStatusData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                  {d.name} <span className="font-black" style={{ color: 'var(--text-primary)' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        )}

        {/* Asset grid */}
        <ChartCard title="Assigned Assets" icon={Boxes} iconColor="#3b82f6" className="lg:col-span-2">
          {assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <PackageX className="w-8 h-8 opacity-30" style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                No assets currently assigned to you.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {assets.map(asset => (
                <div
                  key={asset.assetId}
                  className="flex items-center gap-3 p-3.5 rounded-2xl transition-all"
                  style={{
                    background: 'var(--bg-hover)',
                    border: '1.5px solid var(--border-soft)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                    style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}
                  >
                    {asset.category === 'Static' ? 'STA' : 'MOV'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                      {asset.name}
                    </p>
                    <p className="text-[10px] font-semibold mt-px truncate" style={{ color: 'var(--text-muted)' }}>
                      {asset.assetId} · {asset.model}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: asset.status === 'Active' ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
                      color: asset.status === 'Active' ? '#22c55e' : '#64748b',
                    }}
                  >
                    {asset.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Dashboard;
