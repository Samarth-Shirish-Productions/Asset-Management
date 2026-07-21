import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Upload, X, FileSpreadsheet, CheckCircle2,
  AlertCircle, Info, ChevronDown, Eye, EyeOff,
  Users, User, Loader2, AlertTriangle, RotateCcw,
  Edit2, Trash2, Shield
} from 'lucide-react';
import api from '../services/api';
import Toast from '../components/Toast';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';

/* ─────────────────────────────────────────────────────────────────
   CONSTANTS & FORMAT GUIDE
───────────────────────────────────────────────────────────────── */
const EXCEL_COLUMNS = [
  { name: 'fullName', required: true, desc: 'Full name of the user', example: 'John Doe' },
  { name: 'email', required: true, desc: 'Unique email address', example: 'john@company.com' },
  { name: 'department', required: true, desc: 'Department (e.g. Engineering, Finance)', example: 'Engineering' },
  { name: 'branch', required: true, desc: 'Branch / location', example: 'Head Office' },
  { name: 'role', required: false, desc: 'Admin or Employee (defaults to Employee)', example: 'Employee' },
  { name: 'password', required: false, desc: 'Initial password (omit to send email link)', example: '' },
];

const FormatGuideModal = ({ onClose, fileInputRef }) => (
  <AnimatePresence>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}
      >
        <div
          className="flex justify-between items-center px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--border-soft)' }}
        >
          <p className="breadcrumb">// FORMAT GUIDE</p>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="overflow-x-auto">
            <table className="ams-table">
              <thead>
                <tr>{['Column', 'Required', 'Description', 'Example'].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {EXCEL_COLUMNS.map(c => (
                  <tr key={c.name}>
                    <td className="mono" style={{ color: 'var(--accent)' }}>{c.name}</td>
                    <td>{c.required ? 'Yes' : 'No'}</td>
                    <td>{c.desc}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => { onClose(); setTimeout(() => fileInputRef.current?.click(), 100); }}
            className="btn-primary w-full"
          >
            Choose File & Upload
          </button>
        </div>
      </motion.div>
    </div>
  </AnimatePresence>
);

const BulkResultsModal = ({ results, onClose }) => (
  <Modal isOpen={!!results} onClose={onClose} title="Bulk Upload Results" size="md">
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Total', value: results.total, color: 'var(--accent)' },
          { label: 'Success', value: results.success, color: '#4ade80' },
          { label: 'Failed', value: results.failed, color: '#f87171' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-3" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-soft)' }}>
            <p className="text-lg font-black" style={{ color }}>{value}</p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>
      {results.errors?.length > 0 && (
        <div className="max-h-48 overflow-y-auto p-3 text-xs" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          {results.errors.map((e, i) => (
            <div key={i} className="mb-2">
              <strong style={{ color: '#f87171' }}>Row {e.row} ({e.email}):</strong>
              <ul className="list-disc pl-4 mt-0.5" style={{ color: '#fca5a5' }}>{e.errors.map((err, j) => <li key={j}>{err}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
      <button onClick={onClose} className="btn-primary w-full">Done</button>
    </div>
  </Modal>
);

const Field = ({ label, required, children, error }) => (
  <div className="space-y-1">
    <label className="field-label">
      {label} {required && <span style={{ color: '#f87171' }}>*</span>}
    </label>
    {children}
    {error && (
      <p className="text-[10px] font-medium flex items-center gap-1" style={{ color: '#f87171' }}>
        <AlertCircle className="w-3 h-3" />{error}
      </p>
    )}
  </div>
);

const inputCls = "w-full py-2.5 px-3.5 text-sm font-medium";

/* ─────────────────────────────────────────────────────────────────
   MAIN User Management PAGE
───────────────────────────────────────────────────────────────── */
const Participants = () => {
  const location = useLocation();
  const [tab, setTab] = useState('manage'); // 'manage' | 'individual' | 'bulk'
  const [toast, setToast] = useState(null);

  // Filter & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const roleFilter = location.pathname.includes('/employees') ? 'Employee' : location.pathname.includes('/users') ? 'Admin' : 'All';

  useEffect(() => {
    setPage(1);
  }, [roleFilter, searchQuery, branchFilter, deptFilter]);

  // Data
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Form State
  const initialForm = { fullName: '', email: '', department: '', branch: '', role: 'Employee', password: '' };
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successUser, setSuccessUser] = useState(null);

  // Edit / Delete State
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: null, ...initialForm });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });

  // Bulk State
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchUsers();
    fetchOrgData();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/auth/admin/users');
      if (res.data?.success) setUsers(res.data.users);
    } catch (err) {
      setToast({ message: 'Failed to fetch users', type: 'error' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchOrgData = async () => {
    try {
      const [brRes, dpRes] = await Promise.all([
        api.get('/org/branches'),
        api.get('/org/departments')
      ]);
      if (brRes.data?.success) setBranches(brRes.data.branches);
      if (dpRes.data?.success) setDepartments(dpRes.data.departments);
    } catch (err) {
      console.error('Failed to load org data', err);
    }
  };

  const validate = (data, isEdit = false) => {
    const errs = {};
    if (!data.fullName.trim()) errs.fullName = 'Full name is required';
    if (!data.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.email = 'Enter a valid email address';
    if (!data.department) errs.department = 'Department is required';
    if (!data.branch) errs.branch = 'Branch is required';
    return errs;
  };

  const handleIndividualSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) return setErrors(errs);

    setSubmitting(true);
    try {
      const res = await api.post('/auth/admin/add-user', form);
      setSuccessUser(res.data.user);
      setForm(initialForm);
      setErrors({});
      setToast({ message: res.data.message, type: 'success' });
      fetchUsers();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to create user', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(editForm, true);
    if (Object.keys(errs).length > 0) return setErrors(errs);

    try {
      await api.put(`/auth/admin/users/${editForm.id}`, editForm);
      setToast({ message: 'User updated successfully', type: 'success' });
      setEditModal(false);
      fetchUsers();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to update user', type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/auth/admin/users/${id}`);
      setToast({ message: 'User deleted successfully', type: 'success' });
      setDeleteModal({ isOpen: false, id: null, name: '' });
      fetchUsers();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to delete user', type: 'error' });
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setBulkFile(file);
  }, []);

  const handleBulkUpload = async () => {
    if (!bulkFile) return setToast({ message: 'Please select an Excel or CSV file first.', type: 'error' });
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      const res = await api.post('/auth/admin/bulk-add-users', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBulkResults(res.data.results);
      setBulkFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchUsers();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Bulk upload failed', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const columns = [
    {
      label: 'User', key: 'fullName',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            {r.fullName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{r.fullName}</p>
            <p className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{r.email}</p>
          </div>
        </div>
      )
    },
    {
      label: 'Employee ID', key: 'employeeId',
      render: (r) => (
        <span className="mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {r.employeeId || '—'}
        </span>
      )
    },
    {
      label: 'Role', key: 'role',
      render: (r) => (
        <span
          className={r.role === 'Admin' ? 'badge-storage' : 'badge-retired'}
          style={{ display: 'inline-block' }}
        >
          {r.role}
        </span>
      )
    },
    { label: 'Branch', key: 'branch' },
    { label: 'Department', key: 'department' },
    {
      label: 'Actions', key: 'actions',
      render: (r) => (
        <div className="flex gap-2">
          <button
            onClick={() => { setEditForm({ id: r._id, ...r }); setEditModal(true); }}
            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteModal({ isOpen: true, id: r._id, name: r.fullName })}
            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'All' && u.role !== roleFilter) return false;
    if (branchFilter && u.branch !== branchFilter) return false;
    if (deptFilter && u.department !== deptFilter) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / limit) || 1;
  const paginatedUsers = filteredUsers.slice((page - 1) * limit, page * limit);

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{roleFilter === 'Admin' ? 'Users' : 'Employees'}</h1>
          <p className="page-subtitle">Manage system access, roles, and employee records.</p>
        </div>
        <button
          onClick={() => setTab('individual')}
          className="btn-primary flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" />
          New user
        </button>
      </div>

      {/* ── Tab strip (pill style) ── */}
      <div className="flex gap-2">
        {[
          { key: 'manage', label: roleFilter === 'Admin' ? 'All Users' : 'All Employees', icon: Users },
          ...(roleFilter !== 'Admin' ? [{ key: 'bulk', label: 'Bulk Import', icon: Upload }] : []),
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-md transition-colors`}
            style={{
              background: tab === key ? 'var(--accent)' : 'var(--bg-hover)',
              color: tab === key ? '#fff' : 'var(--text-secondary)'
            }}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

        {/* Manage Tab — flat table */}
        {tab === 'manage' && (
          <motion.div key="manage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <input
                type="text"
                placeholder="Search participants..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full max-w-sm py-2 px-3 text-sm font-medium rounded-lg outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
              />
              <select
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                className="py-2 px-3 text-sm font-medium rounded-lg outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
              >
                <option value="">All Branches</option>
                {branches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
              </select>
              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="py-2 px-3 text-sm font-medium rounded-lg outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
              >
                <option value="">All Departments</option>
                {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <DataTable 
              columns={columns} 
              data={paginatedUsers} 
              loading={loadingUsers} 
              emptyMessage="No participants found." 
              pagination={{ page, limit, total: filteredUsers.length, pages: totalPages }}
              onPageChange={setPage}
            />
          </motion.div>
        )}

        {/* Add Individual Tab */}
        {tab === 'individual' && (
          <motion.div key="individual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="card p-6 max-w-2xl">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: 'var(--text-secondary)' }}>Add New User</h3>
              <form onSubmit={handleIndividualSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Full Name" required error={errors.fullName}>
                    <input type="text" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className={inputCls} placeholder="Jane Smith" />
                  </Field>
                  <Field label="Email Address" required error={errors.email}>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="jane@company.com" />
                  </Field>
                  <Field label="Department" required error={errors.department}>
                    <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className={inputCls}>
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Branch" required error={errors.branch}>
                    <select value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} className={inputCls}>
                      <option value="">Select Branch</option>
                      {branches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Role">
                    <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputCls}>
                      <option value="Employee">Employee</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </Field>
                  <Field label="Initial Password (Optional)">
                    <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={inputCls} placeholder="Leave blank to auto-generate" />
                  </Field>
                </div>
                <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* Bulk Import Tab */}
        {tab === 'bulk' && (
          <motion.div key="bulk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="card p-6 max-w-2xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Bulk Import</h3>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                className="p-10 text-center cursor-pointer transition-colors"
                style={{
                  border: `1px dashed ${dragOver ? 'var(--accent)' : 'var(--border-input)'}`,
                  background: dragOver ? 'var(--accent-light)' : 'var(--bg-input)',
                }}
              >
                <FileSpreadsheet className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                {bulkFile
                  ? <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{bulkFile.name}</p>
                  : <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Drop Excel / CSV file here or click to browse</p>
                }
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => setBulkFile(e.target.files[0] || null)} />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFormatGuide(true)}
                  className="flex-1 py-2.5 text-xs font-semibold transition-colors"
                  style={{ border: '1px solid var(--border-soft)', color: 'var(--text-secondary)', background: 'var(--bg-hover)' }}
                >
                  View Format
                </button>
                <button
                  onClick={handleBulkUpload}
                  disabled={!bulkFile || uploading}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Upload Users
                </button>
              </div>
            </div>
          </motion.div>
        )}
      
      {/* Edit Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit User">
        <form onSubmit={handleEditSubmit} className="space-y-3">
          <Field label="Full Name" required error={errors.fullName}>
            <input type="text" value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Email Address" required error={errors.email}>
            <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Department" required error={errors.department}>
            <select value={editForm.department} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} className={inputCls}>
              <option value="">Select Department</option>
              {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Branch" required error={errors.branch}>
            <select value={editForm.branch} onChange={e => setEditForm(f => ({ ...f, branch: e.target.value }))} className={inputCls}>
              <option value="">Select Branch</option>
              {branches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Role">
            <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} className={inputCls}>
              <option value="Employee">Employee</option>
              <option value="Admin">Admin</option>
            </select>
          </Field>
          <button type="submit" className="btn-primary w-full mt-2">Save Changes</button>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, id: null, name: '' })} title="Remove User">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Are you sure you want to deactivate{' '}
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{deleteModal.name}</span>?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
              className="flex-1 py-2.5 text-xs font-semibold transition-colors"
              style={{ border: '1px solid var(--border-soft)', color: 'var(--text-secondary)', background: 'var(--bg-hover)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteModal.id)}
              className="flex-1 py-2.5 text-xs font-bold text-white transition-colors"
              style={{ background: '#ef4444' }}
            >
              Yes, Deactivate
            </button>
          </div>
        </div>
      </Modal>

      {showFormatGuide && <FormatGuideModal onClose={() => setShowFormatGuide(false)} fileInputRef={fileInputRef} />}
      {bulkResults && <BulkResultsModal results={bulkResults} onClose={() => setBulkResults(null)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Participants;
