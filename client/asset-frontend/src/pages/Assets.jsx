import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import {
  Plus,
  Search,
  SlidersHorizontal,
  Eye,
  Edit3,
  Trash2,
  UserCheck,
  FileText,
  QrCode,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  Info,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Wrench
} from 'lucide-react';

/* ─── Excel column spec (shown in format guide) ─── */
const ASSET_EXCEL_COLUMNS = [
  { name: 'name', required: true, desc: 'Asset name', example: 'Dell Laptop' },
  { name: 'model', required: true, desc: 'Model / make', example: 'Latitude 5520' },
  { name: 'serialNumber', required: true, desc: 'Unique serial number', example: 'SN-20240001' },
  { name: 'category', required: true, desc: 'Static or Movable', example: 'Movable' },
  { name: 'subCategory', required: true, desc: 'Electronics / Furniture / Vehicle / Software License / Appliances', example: 'Electronics' },
  { name: 'department', required: true, desc: 'Owning department', example: 'IT' },
  { name: 'branch', required: true, desc: 'Branch / location', example: 'Pune' },
  { name: 'purchaseDate', required: true, desc: 'Date purchased YYYY-MM-DD', example: '2024-01-15' },
  { name: 'purchaseValue', required: true, desc: 'Purchase cost in ₹', example: '75000' },
  { name: 'warrantyExpiry', required: false, desc: 'Warranty end date YYYY-MM-DD', example: '2027-01-15' },
  { name: 'vendor', required: false, desc: 'Supplier / vendor name', example: 'Dell India' },
  { name: 'status', required: false, desc: 'Active / In Storage / In Repair / Retired / Lost/Damaged', example: 'In Storage' },
  { name: 'notes', required: false, desc: 'Any additional notes', example: '' },
];

/* ─── Format Guide Modal ─── */
const AssetFormatGuideModal = ({ onClose, fileInputRef }) => (
  <AnimatePresence>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 24 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl z-10"
        style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-soft)' }}
      >
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Asset Excel / CSV Format Guide</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Your file must use these exact column headers in row 1</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" style={{ color: 'var(--text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl text-sm" style={{ background: 'var(--accent-light)', border: '1px solid var(--border-soft)' }}>
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              Use row 1 as headers exactly as shown. Columns marked <span className="text-rose-500 font-bold">Required</span> must not be empty.
              Save as <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong>. AssetID and QR codes are <strong>auto-generated</strong>.
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-soft)' }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-soft)' }}>
                  {['Column Header', 'Required', 'Description', 'Example'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ASSET_EXCEL_COLUMNS.map((col, idx) => (
                  <tr key={col.name} style={{ borderBottom: idx < ASSET_EXCEL_COLUMNS.length - 1 ? '1px solid var(--border-soft)' : 'none', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                    <td className="px-3 py-2.5">
                      <code className="font-mono text-xs px-2 py-1 rounded-lg font-bold" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{col.name}</code>
                    </td>
                    <td className="px-3 py-2.5">
                      {col.required ? <span className="text-xs font-bold text-rose-500">Required</span> : <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Optional</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{col.desc}</td>
                    <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{col.example || <em>leave blank</em>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-colors" style={{ borderColor: 'var(--border-input)', color: 'var(--text-secondary)', background: 'transparent' }}>Cancel</button>
            <button
              onClick={() => { onClose(); setTimeout(() => fileInputRef.current?.click(), 100); }}
              className="flex-1 py-2.5 text-sm font-bold rounded-xl text-white flex items-center justify-center gap-2 shadow-md"
              style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}
            >
              <Upload className="w-4 h-4" /> Choose File & Upload
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  </AnimatePresence>
);

/* ─── Bulk Results Modal ─── */
const AssetBulkResultsModal = ({ results, onClose }) => (
  <AnimatePresence>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 24 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl z-10"
        style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-soft)' }}
      >
        <div className="h-1 w-full rounded-t-2xl" style={{ background: results.failed === 0 ? 'linear-gradient(90deg,#10b981,#0891b2)' : 'linear-gradient(90deg,#f59e0b,#ef4444)' }} />
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${results.failed === 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-amber-50 dark:bg-amber-500/10'}`}>
                {results.failed === 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
              </div>
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Asset Import Results</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{results.total} row{results.total !== 1 ? 's' : ''} processed</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" style={{ color: 'var(--text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total', value: results.total, color: 'var(--accent)', bg: 'var(--accent-light)' },
              { label: 'Created', value: results.success, color: '#10b981', bg: '#d1fae5' },
              { label: 'Failed', value: results.failed, color: '#ef4444', bg: '#fee2e2' },
            ].map(c => (
              <div key={c.label} className="rounded-xl p-3 text-center" style={{ background: c.bg }}>
                <p className="text-2xl font-black" style={{ color: c.color }}>{c.value}</p>
                <p className="text-xs font-bold mt-0.5" style={{ color: c.color }}>{c.label}</p>
              </div>
            ))}
          </div>
          {results.created?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2 text-emerald-600">Assets Created</p>
              <div className="space-y-1 max-h-40 overflow-y-auto rounded-xl p-2" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-soft)' }}>
                {results.created.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="font-bold" style={{ color: 'var(--accent)' }}>{a.assetId}</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{a.name}</span>
                    <span className="ml-auto" style={{ color: 'var(--text-muted)' }}>Row {a.row}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {results.errors?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2 text-rose-500">Errors</p>
              <div className="space-y-2 max-h-48 overflow-y-auto rounded-xl p-2" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-soft)' }}>
                {results.errors.map((e, i) => (
                  <div key={i} className="rounded-lg px-3 py-2 text-xs" style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
                    <div className="flex items-center gap-1.5 font-bold text-rose-700 mb-1"><AlertCircle className="w-3.5 h-3.5" />Row {e.row} — {e.serialNumber}</div>
                    <ul className="list-disc list-inside text-rose-600 space-y-0.5">{e.errors.map((err, j) => <li key={j}>{err}</li>)}</ul>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={onClose} className="w-full py-2.5 text-sm font-bold rounded-xl text-white shadow-md" style={{ background: 'linear-gradient(135deg,var(--accent),#7c3aed)' }}>Done</button>
        </div>
      </motion.div>
    </div>
  </AnimatePresence>
);

const Assets = () => {
  const { user } = useAuth();

  // Table states
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [branch, setBranch] = useState('');
  const [assignment, setAssignment] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Modal controls
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Employees for assign dropdown
  const [employees, setEmployees] = useState([]);

  // Toast notifications
  const [toast, setToast] = useState(null);

  // ── Bulk import state ──
  const [showAssetFormatGuide, setShowAssetFormatGuide] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [showBulkDropzone, setShowBulkDropzone] = useState(false);
  const bulkFileInputRef = useRef(null);

  // Form Fields (Create/Edit)
  const [formData, setFormData] = useState({
    name: '', model: '', serialNumber: '', category: 'Movable',
    subCategory: 'Electronics', department: 'IT', branch: 'Pune',
    purchaseDate: '', purchaseValue: '', warrantyExpiry: '',
    vendor: '', notes: '', warrantyProvider: '', supportContact: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);

  // Form Fields (Assign)
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  // Form Fields (Employee Request Removal)
  const [requestReason, setRequestReason] = useState('');
  const [requestType, setRequestType] = useState('Removal');

  // Form Fields (Maintenance)
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({ maintenanceCost: '', expectedReturnDate: '', notes: '' });

  // Constants
  const categories = ['Static', 'Movable'];
  const subCategories = ['Electronics', 'Furniture', 'Vehicle', 'Software License', 'Appliances'];
  const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Design', 'Video Editing', 'Project Management'];
  const branches = ['Pune', 'Bangalore', 'Hyderabad', 'Mumbai'];
  const statuses = ['Active', 'In Storage', 'In Repair', 'Retired', 'Lost/Damaged'];

  // Load list of employees (Admin only, to populate assigning picker)
  const fetchEmployees = async () => {
    try {
      const res = await api.get('/auth/admin/users');
      if (res.data?.success) {
        setEmployees(res.data.users);
      }
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      let endpoint = '/assets';
      const params = {
        page,
        limit: 8,
        search,
        category,
        status,
        department,
        branch,
        sortBy,
        sortOrder
      };

      if (assignment) {
        params.assignedTo = assignment;
      }

      if (user.role === 'Employee') {
        endpoint = '/assets/my';
        delete params.page;
        delete params.limit;
      }

      const res = await api.get(endpoint, { params });
      if (res.data?.success) {
        if (user.role === 'Employee') {
          setAssets(res.data.assets);
          setPagination(null);
        } else {
          setAssets(res.data.assets);
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to fetch assets', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAssets();
      if (user.role === 'Admin') {
        fetchEmployees();
      }
    }
  }, [user, page, search, category, status, department, branch, assignment, sortBy, sortOrder]);

  const handleClearFilters = () => {
    setSearch('');
    setCategory('');
    setStatus('');
    setDepartment('');
    setBranch('');
    setAssignment('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  // ── Bulk import handlers ──
  const handleBulkDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setBulkFile(file);
  }, []);

  const handleBulkUpload = async () => {
    if (!bulkFile) { setToast({ message: 'Please select a file first.', type: 'error' }); return; }
    setBulkUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', bulkFile);
      const res = await api.post('/assets/bulk-import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBulkResults(res.data.results);
      setBulkFile(null);
      setShowBulkDropzone(false);
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
      fetchAssets();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Bulk import failed', type: 'error' });
    } finally {
      setBulkUploading(false);
    }
  };

  // Add or Edit Submission
  const handleSaveAsset = async (e) => {
    e.preventDefault();
    const payload = new FormData();
    Object.keys(formData).forEach(key => {
      payload.append(key, formData[key]);
    });
    if (imageFile) payload.append('image', imageFile);
    if (invoiceFile) payload.append('invoice', invoiceFile);

    try {
      if (selectedAsset) {
        // Edit mode
        await api.put(`/assets/${selectedAsset._id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setToast({ message: 'Asset updated successfully!', type: 'success' });
      } else {
        // Create mode
        await api.post('/assets', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setToast({ message: 'Asset added successfully!', type: 'success' });
      }
      setIsAddEditOpen(false);
      setSelectedAsset(null);
      fetchAssets();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to save asset', type: 'error' });
    }
  };

  // Delete Action
  const handleDeleteAsset = async (id) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      await api.delete(`/assets/${id}`);
      setToast({ message: 'Asset soft-deleted successfully', type: 'success' });
      fetchAssets();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to delete asset', type: 'error' });
    }
  };

  // Assign Action
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/assets/assign', {
        assetId: selectedAsset._id,
        employeeId: selectedEmployee || null, // null means unassign
        notes: assignNotes
      });
      setToast({ message: 'Asset assignment updated!', type: 'success' });
      setIsAssignOpen(false);
      setSelectedAsset(null);
      fetchAssets();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to assign asset', type: 'error' });
    }
  };

  // Employee Submission of Request
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/requests', {
        assetId: selectedAsset._id,
        requestType,
        reason: requestReason
      });
      setToast({ message: 'Removal request submitted successfully!', type: 'success' });
      setIsRequestOpen(false);
      setSelectedAsset(null);
      setRequestReason('');
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to submit request', type: 'error' });
    }
  };

  const openMaintenanceModal = (asset) => {
    setSelectedAsset(asset);
    setMaintenanceForm({ maintenanceCost: '', expectedReturnDate: '', notes: '' });
    setIsMaintenanceOpen(true);
  };

  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/assets/${selectedAsset._id}/maintenance`, maintenanceForm);
      setToast({ message: 'Maintenance logged successfully!', type: 'success' });
      setIsMaintenanceOpen(false);
      setSelectedAsset(null);
      fetchAssets();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to log maintenance', type: 'error' });
    }
  };

  // Helper to pre-populate edit form
  const openEditModal = (asset) => {
    setSelectedAsset(asset);
    setFormData({
      name: asset.name,
      model: asset.model,
      serialNumber: asset.serialNumber,
      category: asset.category,
      subCategory: asset.subCategory,
      department: asset.department,
      branch: asset.branch,
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.substring(0, 10) : '',
      purchaseValue: asset.purchaseValue,
      warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.substring(0, 10) : '',
      vendor: asset.vendor || '',
      notes: asset.notes || '',
      warrantyProvider: asset.warrantyProvider || '',
      supportContact: asset.supportContact || ''
    });
    setImageFile(null);
    setInvoiceFile(null);
    setIsAddEditOpen(true);
  };

  const openAddModal = () => {
    setSelectedAsset(null);
    setFormData({
      name: '', model: '', serialNumber: '', category: 'Movable',
      subCategory: 'Electronics', department: 'IT', branch: 'Pune',
      purchaseDate: '', purchaseValue: '', warrantyExpiry: '',
      vendor: '', notes: '', warrantyProvider: '', supportContact: ''
    });
    setImageFile(null);
    setInvoiceFile(null);
    setIsAddEditOpen(true);
  };

  const openDetailModal = async (asset) => {
    try {
      const res = await api.get(`/assets/${asset._id}`);
      if (res.data?.success) {
        setSelectedAsset(res.data.asset);
        setIsDetailOpen(true);
      }
    } catch (err) {
      setToast({ message: 'Error loading asset history', type: 'error' });
    }
  };

  const openAssignModal = (asset) => {
    setSelectedAsset(asset);
    setSelectedEmployee(asset.assignedTo?._id || '');
    setAssignNotes('');
    setIsAssignOpen(true);
  };

  const openRequestModal = (asset) => {
    setSelectedAsset(asset);
    setIsRequestOpen(true);
  };

  // DataTable columns definitions
  const columns = [
    {
      label: 'Asset ID',
      key: 'assetId',
      sortable: true,
      render: (row) => <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{row.assetId}</span>
    },
    { label: 'Name', key: 'name', sortable: true },
    { label: 'Model', key: 'model' },
    { label: 'Category', key: 'category', sortable: true },
    { label: 'Branch', key: 'branch', sortable: true },
    {
      label: 'Assigned To',
      key: 'assignedTo',
      render: (row) => row.assignedTo ? row.assignedTo.fullName : <span className="text-slate-400 text-xs italic font-semibold">Unassigned</span>
    },
    {
      label: 'Status',
      key: 'status',
      sortable: true,
      render: (row) => {
        const styles = {
          Active: 'bg-emerald-500/10 text-emerald-500',
          'In Storage': 'bg-blue-500/10 text-blue-500',
          'In Repair': 'bg-amber-500/10 text-amber-500',
          'Retired': 'bg-slate-500/10 text-slate-500',
          'Lost/Damaged': 'bg-rose-500/10 text-rose-500',
        };
        return (
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${styles[row.status] || 'bg-slate-100'}`}>
            {row.status}
          </span>
        );
      }
    },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => openDetailModal(row)}
            className="p-1 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-4.5 h-4.5" />
          </button>

          {user.role === 'Admin' ? (
            <>
              <button
                onClick={() => openEditModal(row)}
                className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                title="Edit Asset"
              >
                <Edit3 className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => openAssignModal(row)}
                className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                title="Assign Asset"
              >
                <UserCheck className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => openMaintenanceModal(row)}
                className="p-1 text-slate-400 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                title="Log Maintenance"
              >
                <Wrench className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => handleDeleteAsset(row._id)}
                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                title="Delete Asset"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => openRequestModal(row)}
              className="btn-primary px-3 py-1 text-xs"
            >
              Request Release
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {user.role === 'Admin' ? 'Asset Repository' : 'My Assigned Assets'}
          </h1>
          <p className="page-subtitle">
            {user.role === 'Admin' ? 'Create, monitor, and assign hardware/software lifecycles.' : 'Track hardware assigned to your profile.'}
          </p>
        </div>
        {user.role === 'Admin' && (
          <div className="flex items-center gap-2">

            {/* ── Bulk Import button + dropdown ── */}
            <div className="relative">
              <button
                onClick={() => setShowBulkDropzone(v => !v)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm border-2 transition-all"
                style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-light)' }}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Bulk Import
              </button>

              <AnimatePresence>
                {showBulkDropzone && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl z-30 overflow-hidden"
                    style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-soft)' }}
                  >
                    <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Bulk Import Assets</p>
                        <button onClick={() => setShowBulkDropzone(false)} style={{ color: 'var(--text-muted)' }}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Drop zone */}
                      <div
                        onClick={() => bulkFileInputRef.current?.click()}
                        onDrop={handleBulkDrop}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        className="cursor-pointer rounded-xl border-2 border-dashed p-5 flex flex-col items-center gap-2 text-center transition-all"
                        style={{
                          borderColor: dragOver ? 'var(--accent)' : bulkFile ? '#10b981' : 'var(--border-input)',
                          background: bulkFile ? '#d1fae520' : 'var(--bg-hover)',
                        }}
                      >
                        <FileSpreadsheet className="w-7 h-7" style={{ color: bulkFile ? '#10b981' : 'var(--text-muted)' }} />
                        {bulkFile ? (
                          <>
                            <p className="text-xs font-bold text-emerald-600">{bulkFile.name}</p>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{(bulkFile.size / 1024).toFixed(1)} KB — click to change</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Drop Excel / CSV here</p>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>or click to browse (.xlsx, .xls, .csv)</p>
                          </>
                        )}
                        <input
                          ref={bulkFileInputRef} type="file" accept=".xlsx,.xls,.csv"
                          className="hidden"
                          onChange={e => setBulkFile(e.target.files[0] || null)}
                        />
                      </div>

                      <button
                        onClick={() => setShowAssetFormatGuide(true)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                        style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-soft)' }}
                      >
                        <Info className="w-3.5 h-3.5" /> View required file format
                      </button>

                      <button
                        onClick={handleBulkUpload}
                        disabled={!bulkFile || bulkUploading}
                        className="w-full py-2.5 text-sm font-bold rounded-xl text-white flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}
                      >
                        {bulkUploading
                          ? <><Loader2 className="w-4 h-4 animate-spin" />Importing...</>
                          : <><Upload className="w-4 h-4" />Start Import</>
                        }
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Add single asset ── */}
            <button
              onClick={openAddModal}
              className="btn-primary flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Asset
            </button>
          </div>
        )}
      </div>


      {/* Filter panel (Admin only) */}
      {user.role === 'Admin' && (
        <div className="card p-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID, Name, Serial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-transparent text-xs"
              style={{ border: 'none', borderBottom: '1px solid transparent', borderRadius: 0 }}
            />
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="py-1.5 px-2 bg-transparent text-xs font-semibold cursor-pointer border-none"
            style={{ color: 'var(--text-secondary)' }}
          >
            <option value="">Category (All)</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="py-1.5 px-2 bg-transparent text-xs font-semibold cursor-pointer border-none"
            style={{ color: 'var(--text-secondary)' }}
          >
            <option value="">Status (All)</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="py-1.5 px-2 bg-transparent text-xs font-semibold cursor-pointer border-none"
            style={{ color: 'var(--text-secondary)' }}
          >
            <option value="">Department (All)</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="py-1.5 px-2 bg-transparent text-xs font-semibold cursor-pointer border-none hidden lg:block"
            style={{ color: 'var(--text-secondary)' }}
          >
            <option value="">Branch (All)</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select
            value={assignment}
            onChange={(e) => setAssignment(e.target.value)}
            className="py-1.5 px-2 bg-transparent text-xs font-semibold cursor-pointer border-none hidden xl:block"
            style={{ color: 'var(--text-secondary)' }}
          >
            <option value="">Assignment (All)</option>
            <option value="unassigned">Unassigned</option>
            {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.fullName}</option>)}
          </select>

          <button
            onClick={handleClearFilters}
            className="ml-auto text-xs font-bold px-3 py-1.5 rounded transition-colors"
            style={{ color: 'var(--accent)', background: 'var(--accent-light)' }}
          >
            Reset
          </button>
        </div>
      )}

      {/* DataTable View */}
      <DataTable
        columns={columns}
        data={assets}
        loading={loading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={(key, order) => { setSortBy(key); setSortOrder(order); }}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
        emptyMessage={user.role === 'Admin' ? 'No assets match the search/filters.' : 'No assets assigned to you.'}
      />

      {/* --- MODALS PART --- */}

      {/* Add / Edit Asset Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => { setIsAddEditOpen(false); setSelectedAsset(null); }}
        title={selectedAsset ? `Modify Asset: ${selectedAsset.assetId}` : 'Register New Asset'}
        size="lg"
      >
        <form onSubmit={handleSaveAsset} className="space-y-4 font-sans text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Asset Name</label>
              <input
                type="text" required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 rounded py-2 px-3 text-xs bg-slate-50 dark:bg-slate-900 focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Model / Version</label>
              <input
                type="text" required
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 rounded py-2 px-3 text-xs bg-slate-50 dark:bg-slate-900 focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Serial Number</label>
              <input
                type="text" required
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 rounded py-2 px-3 text-xs bg-slate-50 dark:bg-slate-900 focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 rounded py-2 px-3 text-xs bg-slate-50 dark:bg-slate-900 focus:border-[var(--accent)]"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Sub-category</label>
              <select
                value={formData.subCategory}
                onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 rounded py-2 px-3 text-xs bg-slate-50 dark:bg-slate-900 focus:border-[var(--accent)]"
              >
                {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 rounded py-2 px-3 text-xs bg-slate-50 dark:bg-slate-900 focus:border-[var(--accent)]"
              >
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Branch / Location</label>
              <select
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 rounded py-2 px-3 text-xs bg-slate-50 dark:bg-slate-900 focus:border-[var(--accent)]"
              >
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Purchase Date</label>
              <input
                type="date" required
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 rounded py-2 px-3 text-xs bg-slate-50 dark:bg-slate-900 focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Purchase Value (USD)</label>
              <input
                type="number" required
                value={formData.purchaseValue}
                onChange={(e) => setFormData({ ...formData, purchaseValue: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 rounded py-2 px-3 text-xs bg-slate-50 dark:bg-slate-900 focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Warranty Expiry</label>
              <input
                type="date"
                value={formData.warrantyExpiry}
                onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 rounded py-2 px-3 text-xs bg-slate-50 dark:bg-slate-900 focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Vendor Name</label>
              <input
                type="text"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 rounded py-2 px-3 text-xs bg-slate-50 dark:bg-slate-900 focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Status (Preset)</label>
              <input
                type="text" disabled
                value={selectedAsset ? selectedAsset.status : 'In Storage (Default)'}
                className="w-full border border-slate-200 dark:border-slate-850/80 bg-slate-50 dark:bg-slate-850 rounded py-2 px-3 text-xs disabled:opacity-70 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Warranty Provider</label>
              <input
                type="text"
                value={formData.warrantyProvider}
                onChange={(e) => setFormData({ ...formData, warrantyProvider: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 rounded py-2 px-3 text-xs bg-slate-50 dark:bg-slate-900 focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Support Contact</label>
              <input
                type="text"
                value={formData.supportContact}
                onChange={(e) => setFormData({ ...formData, supportContact: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 rounded py-2 px-3 text-xs bg-slate-50 dark:bg-slate-900 focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Upload Asset Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                className="w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-600 dark:file:text-slate-400"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Upload Invoice PDF/Doc</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setInvoiceFile(e.target.files[0])}
                className="w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-600 dark:file:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-500 uppercase mb-1.5">Remarks / Description</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-800 rounded py-2 px-3 text-xs bg-slate-50 dark:bg-slate-900 focus:border-[var(--accent)]"
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-3"
          >
            Save Asset Details
          </button>
        </form>
      </Modal>

      {/* Asset Details & Audit Trail modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedAsset(null); }}
        title={selectedAsset ? `Asset Details: ${selectedAsset.assetId}` : ''}
        size="lg"
      >
        {selectedAsset && (
          <div className="space-y-6 font-sans text-xs">
            <div className="grid grid-cols-3 gap-6">
              {/* Info summary */}
              <div className="col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-y-3.5 gap-x-2 border-b border-slate-100 dark:border-slate-800/40 pb-4">
                  <div>
                    <span className="font-bold text-slate-400">Name</span>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">{selectedAsset.name}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">Model</span>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">{selectedAsset.model}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">Serial Number</span>
                    <p className="font-bold text-slate-700 dark:text-slate-200 mt-0.5">{selectedAsset.serialNumber}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">Assignment Profile</span>
                    <p className="font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                      {selectedAsset.assignedTo ? `${selectedAsset.assignedTo.fullName} (${selectedAsset.assignedTo.department})` : 'In Storage'}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">Purchase Date</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                      {new Date(selectedAsset.purchaseDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">Warranty Expiry</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                      {selectedAsset.warrantyExpiry ? new Date(selectedAsset.warrantyExpiry).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  {user.role === 'Admin' && (
                    <div>
                      <span className="font-bold text-slate-400">Purchase Value</span>
                      <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">${selectedAsset.purchaseValue}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-slate-400">Vendor</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{selectedAsset.vendor || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">Warranty Provider</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{selectedAsset.warrantyProvider || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">Support Contact</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{selectedAsset.supportContact || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  {selectedAsset.imageUrl && (
                    <a
                      href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${selectedAsset.imageUrl}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-indigo-500 font-bold hover:underline"
                    >
                      <ImageIcon className="w-4 h-4" />
                      View Image
                    </a>
                  )}
                  {selectedAsset.invoiceUrl && user.role === 'Admin' && (
                    <a
                      href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${selectedAsset.invoiceUrl}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-indigo-500 font-bold hover:underline"
                    >
                      <FileText className="w-4 h-4" />
                      View Invoice Document
                    </a>
                  )}
                </div>
              </div>

              {/* QR and Status columns */}
              <div className="col-span-1 flex flex-col items-center justify-between border-l border-slate-100 dark:border-slate-800/40 pl-6">
                <div className="flex flex-col items-center">
                  <span className="font-bold text-slate-450 uppercase mb-2">Asset QR Identifier</span>
                  <div className="p-2 border border-slate-200 dark:border-slate-800 bg-white rounded-xl shadow-inner">
                    <img
                      src={selectedAsset.qrCode}
                      alt="Asset QR"
                      className="w-28 h-28"
                    />
                  </div>
                  <a
                    href={selectedAsset.qrCode}
                    download={`QR-${selectedAsset.assetId}.png`}
                    className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 mt-2 flex items-center gap-1"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Download QR Code
                  </a>
                </div>
              </div>
            </div>

            {/* Audit log trail */}
            <div>
              <h4 className="font-extrabold text-[11px] text-slate-500 uppercase mb-3.5">Lifecycle History Audit Trail</h4>
              <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                {selectedAsset.auditTrail.map((log, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-950/20"
                  >
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-slate-800 dark:text-slate-200">{log.action}</span>
                      <span className="text-slate-400 font-semibold text-[10px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-1 font-semibold leading-relaxed">
                      {log.details}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                      Performed By: {log.performedBy ? `${log.performedBy.fullName} (${log.performedBy.role})` : 'System'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Assignment Modal (Admin only) */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => { setIsAssignOpen(false); setSelectedAsset(null); }}
        title="Asset Assignment Panel"
        size="sm"
      >
        {selectedAsset && (
          <form onSubmit={handleAssignSubmit} className="space-y-4 font-sans text-xs">
            <div>
              <span className="font-bold text-slate-400 block mb-1">Asset ID</span>
              <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{selectedAsset.assetId} — {selectedAsset.name}</p>
            </div>

            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Select Employee</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs"
              >
                <option value="">Unassigned (In Storage)</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.fullName} ({emp.email})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Assignment Reason / Notes</label>
              <textarea
                rows={3}
                required
                placeholder="Reason for deployment or return..."
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-colors"
            >
              Update Asset Assignment
            </button>
          </form>
        )}
      </Modal>

      {/* Removal Request Modal (Employee only) */}
      <Modal
        isOpen={isRequestOpen}
        onClose={() => { setIsRequestOpen(false); setSelectedAsset(null); }}
        title="Request Asset Transfer / Release"
        size="sm"
      >
        {selectedAsset && (
          <form onSubmit={handleRequestSubmit} className="space-y-4 font-sans text-xs">
            <div>
              <span className="font-bold text-slate-400 block mb-1">Asset Model</span>
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">{selectedAsset.name} ({selectedAsset.assetId})</p>
            </div>

            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Request Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-350">
                  <input
                    type="radio"
                    name="reqType"
                    value="Removal"
                    checked={requestType === 'Removal'}
                    onChange={() => setRequestType('Removal')}
                  />
                  Release / Return to storage
                </label>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-350">
                  <input
                    type="radio"
                    name="reqType"
                    value="Reassignment"
                    checked={requestType === 'Reassignment'}
                    onChange={() => setRequestType('Reassignment')}
                  />
                  Reassignment to other user
                </label>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Justification Reason</label>
              <textarea
                rows={3}
                required
                placeholder="State why you are requesting this release/transfer..."
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-colors"
            >
              Submit Transfer Request
            </button>
          </form>
        )}
      </Modal>

      {/* Global Toast Panel */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Asset Format Guide Modal */}
      {showAssetFormatGuide && (
        <AssetFormatGuideModal
          onClose={() => setShowAssetFormatGuide(false)}
          fileInputRef={bulkFileInputRef}
        />
      )}

      {/* Maintenance Modal */}
      <Modal
        isOpen={isMaintenanceOpen}
        onClose={() => { setIsMaintenanceOpen(false); setSelectedAsset(null); }}
        title="Log Asset Maintenance"
        size="sm"
      >
        {selectedAsset && (
          <form onSubmit={handleMaintenanceSubmit} className="space-y-4 font-sans text-xs">
            <div>
              <span className="font-bold text-slate-400 block mb-1">Asset ID</span>
              <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{selectedAsset.assetId} — {selectedAsset.name}</p>
            </div>

            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Maintenance Cost (USD)</label>
              <input
                type="number" required
                value={maintenanceForm.maintenanceCost}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, maintenanceCost: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Expected Return Date</label>
              <input
                type="date" required
                value={maintenanceForm.expectedReturnDate}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, expectedReturnDate: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Maintenance Notes</label>
              <textarea
                rows={3} required
                placeholder="Details about the repair..."
                value={maintenanceForm.notes}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-colors"
            >
              Log Maintenance
            </button>
          </form>
        )}
      </Modal>

      {/* Bulk Import Results Modal */}
      {bulkResults && (
        <AssetBulkResultsModal
          results={bulkResults}
          onClose={() => setBulkResults(null)}
        />
      )}
    </div>
  );
};

export default Assets;
