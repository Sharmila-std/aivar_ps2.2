import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  UserMinus, 
  Check, 
  X, 
  Eye, 
  Clock, 
  MapPin, 
  FileText,
  AlertCircle
} from 'lucide-react';
import api from '../api';

const AdminPendingTasks = () => {
  const [activeTab, setActiveTab] = useState('registrations');
  const [registrations, setRegistrations] = useState([]);
  const [deletions, setDeletions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal for detail view
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskType, setTaskType] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'registrations') {
        const res = await api.get('/api/customers/pending');
        // Filter only 'Pending' status requests
        setRegistrations(res.data.filter(r => r.request_status === 'Pending'));
      } else {
        const res = await api.get('/api/customers', {
          params: { status: 'PENDING_DELETE', limit: 100 }
        });
        setDeletions(res.data.items || []);
      }
    } catch (err) {
      console.error('Error fetching admin pending tasks', err);
      setError('Failed to fetch pending approval tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeTab]);

  const handleApproveRegistration = async (id) => {
    try {
      await api.put(`/api/customers/pending/${id}`, { request_status: 'Approved' });
      setSuccess('Customer registration approved successfully! Credentials sent via email.');
      setSelectedTask(null);
      fetchTasks();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error(err);
      setError('Failed to approve registration request.');
    }
  };

  const handleRejectRegistration = async (id) => {
    try {
      await api.put(`/api/customers/pending/${id}`, { request_status: 'Rejected' });
      setSuccess('Customer registration request rejected.');
      setSelectedTask(null);
      fetchTasks();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error(err);
      setError('Failed to reject registration request.');
    }
  };

  const handleApproveDeletion = async (customerId) => {
    try {
      await api.delete(`/api/customers/${customerId}`);
      setSuccess(`Customer account ${customerId} permanently deleted.`);
      setSelectedTask(null);
      fetchTasks();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error(err);
      setError('Failed to delete customer profile.');
    }
  };

  const handleRejectDeletion = async (customerId) => {
    try {
      // Revert status to Approved
      await api.put(`/api/customers/${customerId}`, { status: 'Approved' });
      setSuccess('Customer account deletion request rejected. Account restored to Approved.');
      setSelectedTask(null);
      fetchTasks();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error(err);
      setError('Failed to reject deletion request.');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
          Admin Pending Tasks
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Review and approve manager registration forms or customer account operations.
        </p>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-3">
          <Check size={16} />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('registrations')}
          className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 -mb-[2px] flex items-center gap-2 ${
            activeTab === 'registrations'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserPlus size={16} />
          New Customer Registrations
        </button>
        <button
          onClick={() => setActiveTab('deletions')}
          className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 -mb-[2px] flex items-center gap-2 ${
            activeTab === 'deletions'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserMinus size={16} />
          Customer Deletion Requests
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-t-indigo-500 border-slate-800 animate-spin"></div>
        </div>
      ) : activeTab === 'registrations' ? (
        // Registrations Board
        registrations.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            No pending registration requests found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {registrations.map((task) => (
              <div 
                key={task.request_id}
                className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5">
                      <UserPlus size={10} />
                      New Client Request
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(task.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
                    {task.full_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{task.email}</p>
                  
                  <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
                    <MapPin size={12} />
                    <span>Region: {task.region || 'Global'}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => { setSelectedTask(task); setTaskType('registration'); }}
                    className="flex-1 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs rounded-xl flex items-center justify-center gap-2 transition-all font-medium"
                  >
                    <Eye size={14} />
                    View Details
                  </button>
                  <button
                    onClick={() => handleApproveRegistration(task.request_id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl flex items-center justify-center transition-all"
                    title="Approve"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleRejectRegistration(task.request_id)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl flex items-center justify-center transition-all"
                    title="Reject"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Deletions Board
        deletions.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            No pending account deletion requests found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deletions.map((task) => (
              <div 
                key={task.customer_id}
                className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5">
                      <UserMinus size={10} />
                      Delete Account Request
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded font-mono">
                      {task.customer_id}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
                    {task.full_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{task.email}</p>
                  
                  <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
                    <MapPin size={12} />
                    <span>Region: {task.region || 'Global'}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => { setSelectedTask(task); setTaskType('deletion'); }}
                    className="flex-1 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs rounded-xl flex items-center justify-center gap-2 transition-all font-medium"
                  >
                    <Eye size={14} />
                    View Profile
                  </button>
                  <button
                    onClick={() => handleApproveDeletion(task.customer_id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl flex items-center justify-center transition-all"
                    title="Confirm Delete"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleRejectDeletion(task.customer_id)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl flex items-center justify-center transition-all"
                    title="Reject Delete"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Details View Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <FileText className="text-indigo-400" size={18} />
                Approval Details
              </h2>
              <button 
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-200 rounded-lg p-1 hover:bg-slate-800/40 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {taskType === 'registration' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Full Name</p>
                      <p className="text-sm font-medium text-slate-350">{selectedTask.full_name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Region</p>
                      <p className="text-sm font-medium text-slate-350">{selectedTask.region || 'Global'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Email</p>
                      <p className="text-sm font-medium text-slate-350">{selectedTask.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Phone</p>
                      <p className="text-sm font-medium text-slate-350">{selectedTask.phone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Address</p>
                      <p className="text-sm font-medium text-slate-350">{selectedTask.address}</p>
                    </div>
                    <div className="border-t border-slate-800/60 col-span-2 my-2"></div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Aadhaar Number</p>
                      <p className="text-sm font-mono text-indigo-300">{selectedTask.aadhaar_number || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">PAN Number</p>
                      <p className="text-sm font-mono text-indigo-300">{selectedTask.pan_number || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Card Number</p>
                      <p className="text-sm font-mono text-indigo-300">{selectedTask.card_number || 'N/A'}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Customer ID</p>
                      <p className="text-sm font-mono font-bold text-rose-400">{selectedTask.customer_id}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Full Name</p>
                      <p className="text-sm font-medium text-slate-350">{selectedTask.full_name}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Email</p>
                      <p className="text-sm font-medium text-slate-350">{selectedTask.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Region</p>
                      <p className="text-sm font-medium text-slate-350">{selectedTask.region || 'Global'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Address</p>
                      <p className="text-sm font-medium text-slate-350">{selectedTask.address}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-950/40 flex justify-end gap-2">
              <button 
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 text-xs font-semibold transition-colors"
              >
                Close
              </button>
              {taskType === 'registration' ? (
                <>
                  <button 
                    onClick={() => handleRejectRegistration(selectedTask.request_id)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
                  >
                    Reject Registration
                  </button>
                  <button 
                    onClick={() => handleApproveRegistration(selectedTask.request_id)}
                    className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors"
                  >
                    Approve Registration
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => handleRejectDeletion(selectedTask.customer_id)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
                  >
                    Reject Delete
                  </button>
                  <button 
                    onClick={() => handleApproveDeletion(selectedTask.customer_id)}
                    className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors"
                  >
                    Approve Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPendingTasks;
