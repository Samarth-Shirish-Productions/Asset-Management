import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Building, MapPin, Building2, Plus, Edit2, Trash2 } from 'lucide-react';

const OrgSetup = () => {
  // Branches state
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchModal, setBranchModal] = useState(false);
  const [branchForm, setBranchForm] = useState({ id: null, name: '', location: '' });

  // Departments state
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [deptModal, setDeptModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ id: null, name: '', branch: '' });

  // Common UI state
  const [toast, setToast] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: '', id: null, name: '' });

  useEffect(() => {
    fetchBranches();
    fetchDepartments();
  }, []);

  // ─── Branches Methods ───
  const fetchBranches = async () => {
    setLoadingBranches(true);
    try {
      const res = await api.get('/org/branches');
      if (res.data?.success) setBranches(res.data.branches);
    } catch (err) {
      setToast({ message: 'Failed to fetch branches', type: 'error' });
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    try {
      if (branchForm.id) {
        await api.put(`/org/branches/${branchForm.id}`, branchForm);
        setToast({ message: 'Branch updated successfully', type: 'success' });
      } else {
        await api.post('/org/branches', branchForm);
        setToast({ message: 'Branch created successfully', type: 'success' });
      }
      setBranchModal(false);
      fetchBranches();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Error saving branch', type: 'error' });
    }
  };

  const deleteBranch = async (id) => {
    try {
      await api.delete(`/org/branches/${id}`);
      setToast({ message: 'Branch deleted', type: 'success' });
      setDeleteModal({ isOpen: false, type: '', id: null, name: '' });
      fetchBranches();
    } catch (err) {
      setToast({ message: 'Failed to delete branch', type: 'error' });
    }
  };

  // ─── Departments Methods ───
  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const res = await api.get('/org/departments');
      if (res.data?.success) setDepartments(res.data.departments);
    } catch (err) {
      setToast({ message: 'Failed to fetch departments', type: 'error' });
    } finally {
      setLoadingDepartments(false);
    }
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    try {
      if (deptForm.id) {
        await api.put(`/org/departments/${deptForm.id}`, deptForm);
        setToast({ message: 'Department updated successfully', type: 'success' });
      } else {
        await api.post('/org/departments', deptForm);
        setToast({ message: 'Department created successfully', type: 'success' });
      }
      setDeptModal(false);
      fetchDepartments();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Error saving department', type: 'error' });
    }
  };

  const deleteDepartment = async (id) => {
    try {
      await api.delete(`/org/departments/${id}`);
      setToast({ message: 'Department deleted', type: 'success' });
      setDeleteModal({ isOpen: false, type: '', id: null, name: '' });
      fetchDepartments();
    } catch (err) {
      setToast({ message: 'Failed to delete department', type: 'error' });
    }
  };

  // ─── Table Columns ───
  const branchColumns = [
    { label: 'Name', key: 'name', render: (row) => <span className="font-bold">{row.name}</span> },
    { label: 'Location', key: 'location' },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => { setBranchForm({ id: row._id, name: row.name, location: row.location || '' }); setBranchModal(true); }}
            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteModal({ isOpen: true, type: 'branch', id: row._id, name: row.name })}
            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const deptColumns = [
    { label: 'Name', key: 'name', render: (row) => <span className="font-bold">{row.name}</span> },
    { label: 'Branch', key: 'branch' },
    {
      label: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => { setDeptForm({ id: row._id, name: row.name, branch: row.branch || '' }); setDeptModal(true); }}
            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteModal({ isOpen: true, type: 'department', id: row._id, name: row.name })}
            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="page-container space-y-6">
      <div className="page-header">
        <div>
          <p className="breadcrumb mb-1">// ORGANIZATION</p>
          <h1 className="page-title">Organization Setup</h1>
          <p className="page-subtitle">Manage company branches and departments globally.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Branches Panel */}
        <div className="card p-6 flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 opacity-50" style={{ color: 'var(--text-primary)' }} />
              <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Branches</h3>
            </div>
            <button
              onClick={() => { setBranchForm({ id: null, name: '', location: '' }); setBranchModal(true); }}
              className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-[11px]"
            >
              <Plus className="w-3.5 h-3.5" /> New Branch
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <DataTable columns={branchColumns} data={branches} loading={loadingBranches} emptyMessage="No branches found." borderless={true} />
          </div>
        </div>

        {/* Departments Panel */}
        <div className="card p-6 flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
               <Building className="w-5 h-5 opacity-50" style={{ color: 'var(--text-primary)' }} />
               <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Departments</h3>
            </div>
            <button
              onClick={() => { setDeptForm({ id: null, name: '', branch: '' }); setDeptModal(true); }}
              className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-[11px]"
            >
              <Plus className="w-3.5 h-3.5" /> New Department
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <DataTable columns={deptColumns} data={departments} loading={loadingDepartments} emptyMessage="No departments found." borderless={true} />
          </div>
        </div>
      </div>

      {/* Branch Modal */}
      <Modal isOpen={branchModal} onClose={() => setBranchModal(false)} title={branchForm.id ? 'Edit Branch' : 'Create Branch'} size="sm">
        <form onSubmit={handleBranchSubmit} className="space-y-4 font-sans text-xs">
          <div>
            <label className="field-label">Branch Name</label>
            <input type="text" required value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} placeholder="e.g. Pune" className="w-full py-2 px-3" />
          </div>
          <div>
            <label className="field-label">Location (Optional)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input type="text" value={branchForm.location} onChange={e => setBranchForm({ ...branchForm, location: e.target.value })} placeholder="Address or City" className="w-full pl-9 pr-3 py-2" />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full py-3">
            {branchForm.id ? 'Save Changes' : 'Create Branch'}
          </button>
        </form>
      </Modal>

      {/* Department Modal */}
      <Modal isOpen={deptModal} onClose={() => setDeptModal(false)} title={deptForm.id ? 'Edit Department' : 'Create Department'} size="sm">
        <form onSubmit={handleDeptSubmit} className="space-y-4 font-sans text-xs">
          <div>
            <label className="field-label">Department Name</label>
            <input type="text" required value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="e.g. IT" className="w-full py-2 px-3" />
          </div>
          <div>
            <label className="field-label">Map to Branch (Optional)</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <select value={deptForm.branch} onChange={e => setDeptForm({ ...deptForm, branch: e.target.value })} className="w-full pl-9 pr-3 py-2 appearance-none">
                <option value="">-- No Branch Mapping --</option>
                {branches.map(b => (
                  <option key={b._id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="btn-primary w-full py-3">
            {deptForm.id ? 'Save Changes' : 'Create Department'}
          </button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, type: '', id: null, name: '' })} title={`Delete ${deleteModal.type}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deleteModal.name}</strong>?
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setDeleteModal({ isOpen: false, type: '', id: null, name: '' })}
              className="flex-1 py-2.5 text-xs font-bold transition-colors"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)', borderRadius: '4px' }}
            >
              Cancel
            </button>
            <button
              onClick={() => deleteModal.type === 'branch' ? deleteBranch(deleteModal.id) : deleteDepartment(deleteModal.id)}
              className="flex-1 py-2.5 text-white text-xs font-bold transition-colors"
              style={{ background: '#ef4444', borderRadius: '4px' }}
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default OrgSetup;
