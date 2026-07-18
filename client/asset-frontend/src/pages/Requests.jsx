import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Check, X, ShieldAlert, FileText, Calendar, User, CornerDownRight } from 'lucide-react';

const Requests = () => {
  const { user } = useAuth();
  
  // States
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('All');
  
  // Modal controls
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [actionType, setActionType] = useState('Approve'); // 'Approve' or 'Reject'

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests');
      if (res.data?.success) {
        setRequests(res.data.requests);
      }
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to fetch requests', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  // Handle Approve/Reject Submission
  const handleProcessRequest = async (e) => {
    e.preventDefault();
    const status = actionType === 'Approve' ? 'Approved' : 'Rejected';
    
    try {
      await api.put(`/requests/${selectedRequest._id}`, {
        status,
        adminRemarks
      });
      setToast({ message: `Request successfully ${status.toLowerCase()}!`, type: 'success' });
      setIsOpen(false);
      setSelectedRequest(null);
      setAdminRemarks('');
      fetchRequests();
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to process request', type: 'error' });
    }
  };

  const openProcessModal = (req, type) => {
    setSelectedRequest(req);
    setActionType(type);
    setAdminRemarks('');
    setIsOpen(true);
  };

  // DataTable columns definitions
  const columns = [
    {
      label: 'Asset ID',
      key: 'assetId',
      render: (row) => <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{row.asset?.assetId || 'N/A'}</span>
    },
    {
      label: 'Asset Name',
      key: 'assetName',
      render: (row) => row.asset?.name || 'Deleted Asset'
    },
    {
      label: 'Requester',
      key: 'employee',
      render: (row) => row.employee ? `${row.employee.fullName} (${row.employee.department})` : 'System User'
    },
    {
      label: 'Request Type',
      key: 'requestType',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
          row.requestType === 'Removal' ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-500'
        }`}>
          {row.requestType}
        </span>
      )
    },
    { label: 'Reason', key: 'reason' },
    {
      label: 'Status',
      key: 'status',
      render: (row) => {
        const colors = {
          Pending: 'bg-amber-500/10 text-amber-500',
          Approved: 'bg-emerald-500/10 text-emerald-500',
          Rejected: 'bg-rose-500/10 text-rose-500',
        };
        return (
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${colors[row.status]}`}>
            {row.status}
          </span>
        );
      }
    },
    {
      label: 'Date',
      key: 'createdAt',
      render: (row) => new Date(row.createdAt).toLocaleDateString()
    },
    {
      label: 'Actions / Remarks',
      key: 'actions',
      render: (row) => {
        if (row.status === 'Pending' && user.role === 'Admin') {
          return (
            <div className="flex gap-2">
              <button
                onClick={() => openProcessModal(row, 'Approve')}
                className="p-1 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                title="Approve Request"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => openProcessModal(row, 'Reject')}
                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                title="Reject Request"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        }
        
        return (
          <span className="text-slate-400 font-semibold text-xs italic">
            {row.adminRemarks ? `Remarks: ${row.adminRemarks}` : '—'}
          </span>
        );
      }
    }
  ];

  const filteredRequests = requests.filter(req => filter === 'All' || req.status === filter);
  
  const counts = {
    Pending: requests.filter(r => r.status === 'Pending').length,
    Approved: requests.filter(r => r.status === 'Approved').length,
    Rejected: requests.filter(r => r.status === 'Rejected').length,
  };

  return (
    <div className="page-container space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {user.role === 'Admin' ? 'Transfer & Release Requests' : 'My Requests Logs'}
          </h1>
          <p className="page-subtitle">
            {user.role === 'Admin' ? 'Approve or reject asset removals and reassignment logs.' : 'Track the review pipeline of your release requests.'}
          </p>
        </div>
        
        {/* Status Counts */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</span>
            <span className="text-sm font-black text-amber-500">{counts.Pending}</span>
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved</span>
            <span className="text-sm font-black text-emerald-500">{counts.Approved}</span>
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rejected</span>
            <span className="text-sm font-black text-rose-500">{counts.Rejected}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
        {['All', 'Pending', 'Approved', 'Rejected'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className="px-4 py-2 text-xs font-bold transition-colors border-b-2"
            style={{
              color: filter === tab ? 'var(--accent)' : 'var(--text-secondary)',
              borderColor: filter === tab ? 'var(--accent)' : 'transparent',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Requests table */}
      <DataTable
        columns={columns}
        data={filteredRequests}
        loading={loading}
        emptyMessage="No asset requests match the current filter."
      />

      {/* Approve/Reject remarks prompt Modal (Admin only) */}
      <Modal
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); setSelectedRequest(null); }}
        title={`${actionType} Request: ${selectedRequest?.asset?.assetId}`}
        size="sm"
      >
        {selectedRequest && (
          <form onSubmit={handleProcessRequest} className="space-y-4 font-sans text-xs">
            {/* Quick summary card */}
            <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20">
              <div className="flex gap-2.5 items-start">
                <User className="w-4.5 h-4.5 text-slate-400 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-200">{selectedRequest.employee.fullName}</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{selectedRequest.employee.department} Office</p>
                </div>
              </div>
              <div className="flex gap-2.5 items-start mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/40">
                <FileText className="w-4.5 h-4.5 text-indigo-500 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-200">{selectedRequest.asset?.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Reason: {selectedRequest.reason}</p>
                </div>
              </div>
            </div>

            {/* Remarks Input */}
            <div>
              <label className="block font-bold text-slate-500 uppercase mb-1.5">Remarks / Rationale</label>
              <textarea
                rows={3}
                required
                placeholder="Include explanation for approval or rejection..."
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs"
              />
            </div>

            <button
              type="submit"
              className={`w-full py-3.5 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-colors ${
                actionType === 'Approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              Confirm {actionType}
            </button>
          </form>
        )}
      </Modal>

      {/* Global Toast Panel */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Requests;
