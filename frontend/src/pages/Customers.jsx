import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight, X, User, AlertCircle, Check, Brain, Sparkles, Send, Play, Terminal, UserCheck, Shield } from 'lucide-react';
import api from '../api';

const Customers = () => {
  const userStr = localStorage.getItem('user');
  const loggedInUser = userStr ? JSON.parse(userStr) : null;
  const isCustomer = loggedInUser?.role_name === 'Customer';

  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('customer_id');
  const [sortDesc, setSortDesc] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 8;

  // Modals state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    customer_id: '',
    full_name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    status: 'Approved'
  });

  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      if (isCustomer) {
        const res = await api.get(`/api/customers/${loggedInUser.employee_id}`);
        setCustomers([res.data]);
        setTotal(1);
      } else {
        const skip = (page - 1) * limit;
        const res = await api.get('/api/customers', {
          params: {
            search: search || undefined,
            status: statusFilter !== 'All' ? statusFilter : undefined,
            sort_by: sortBy,
            sort_desc: sortDesc,
            skip,
            limit
          }
        });
        setCustomers(res.data.items);
        setTotal(res.data.total);
      }
    } catch (err) {
      console.error('Error fetching customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter, sortBy, sortDesc, page]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(column);
      setSortDesc(false);
    }
    setPage(1);
  };

  const openViewModal = (customer) => {
    setSelectedCustomer(customer);
    setIsViewModalOpen(true);
  };

  const openCreateModal = () => {
    setFormData({
      customer_id: 'CUS' + Math.floor(100000 + Math.random() * 900000),
      full_name: '',
      email: '',
      phone: '',
      address: '',
      password: '',
      status: 'Approved',
      aadhaar_number: '',
      pan_number: '',
      card_number: '',
      region: loggedInUser?.region || 'Coimbatore'
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      customer_id: customer.customer_id,
      full_name: customer.full_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      password: '', // Leave blank if not changing
      status: customer.status,
      aadhaar_number: customer.aadhaar_number || '',
      pan_number: customer.pan_number || '',
      card_number: customer.card_number || '',
      region: customer.region || ''
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      await api.post('/api/customers', formData);
      setIsCreateModalOpen(false);
      fetchCustomers();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Validation error occurred.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      const payload = { ...formData };
      if (!payload.password) {
        delete payload.password; // Do not send empty password
      }
      await api.put(`/api/customers/${selectedCustomer.customer_id}`, payload);
      setIsEditModalOpen(false);
      fetchCustomers();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Validation error occurred.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (customerId) => {
    if (window.confirm(`Are you sure you want to delete customer ${customerId}?`)) {
      try {
        await api.delete(`/api/customers/${customerId}`);
        fetchCustomers();
      } catch (err) {
        alert('Failed to delete customer.');
      }
    }
  };

  const totalPages = Math.ceil(total / limit);

  // Profile Update Request state (for customers)
  const [isUpdateRequestModalOpen, setIsUpdateRequestModalOpen] = useState(false);
  const [updateRequestFields, setUpdateRequestFields] = useState({ phone: '', address: '' });
  const [updateRequestLoading, setUpdateRequestLoading] = useState(false);
  const [updateRequestSuccess, setUpdateRequestSuccess] = useState('');
  const [updateRequestError, setUpdateRequestError] = useState('');

  const handleSubmitUpdateRequest = async (e) => {
    e.preventDefault();
    setUpdateRequestLoading(true);
    setUpdateRequestError('');
    setUpdateRequestSuccess('');
    
    // Build updates dict with only non-empty fields
    const updates = {};
    if (updateRequestFields.phone.trim()) updates.phone = updateRequestFields.phone.trim();
    if (updateRequestFields.address.trim()) updates.address = updateRequestFields.address.trim();
    
    if (Object.keys(updates).length === 0) {
      setUpdateRequestError('Please fill in at least one field to update.');
      setUpdateRequestLoading(false);
      return;
    }
    
    try {
      const customerId = loggedInUser?.employee_id;
      await api.post(`/api/customers/${customerId}/update-request`, { updates });
      setUpdateRequestSuccess('Profile update request submitted successfully! Your regional manager will review it shortly.');
      setUpdateRequestFields({ phone: '', address: '' });
      setTimeout(() => {
        setIsUpdateRequestModalOpen(false);
        setUpdateRequestSuccess('');
      }, 3000);
    } catch (err) {
      setUpdateRequestError(err.response?.data?.detail || 'Failed to submit update request. Please try again.');
    } finally {
      setUpdateRequestLoading(false);
    }
  };

  // AI Profile Update Workspace state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiToolCall, setAiToolCall] = useState(null);
  const [aiExecutionResult, setAiExecutionResult] = useState(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState('');
  const [aiErrorMsg, setAiErrorMsg] = useState('');
  const [aiStep, setAiStep] = useState('idle'); // idle, generating, generated, executing, completed

  const handleAIGenerate = async (suggestedText) => {
    const activePrompt = suggestedText || aiPrompt;
    if (!activePrompt.trim()) return;

    if (suggestedText) {
      setAiPrompt(activePrompt);
    }

    setAiLoading(true);
    setAiStep('generating');
    setAiToolCall(null);
    setAiExecutionResult(null);
    setAiSuccessMsg('');
    setAiErrorMsg('');

    try {
      const res = await api.post('/api/ai/generate', { prompt: activePrompt });
      const tc = res.data.tool_call;
      setAiToolCall(tc);
      setAiStep('generated');
    } catch (err) {
      console.error(err);
      setAiErrorMsg('Failed to generate tool JSON from prompt.');
      setAiStep('idle');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIExecute = async () => {
    if (!aiToolCall) return;

    setAiLoading(true);
    setAiStep('executing');
    setAiSuccessMsg('');
    setAiErrorMsg('');
    setAiExecutionResult(null);

    try {
      const res = await api.post('/api/ai/execute', { tool_call: aiToolCall, prompt: aiPrompt });
      setAiExecutionResult(res.data);
      if (res.data.success) {
        setAiSuccessMsg('Profile update request submitted successfully via AI workspace! Pending regional manager review.');
        setAiStep('completed');
        setAiPrompt('');
      } else {
        setAiErrorMsg(res.data.error?.reason || 'Gateway blocked this operation.');
        setAiStep('completed');
      }
    } catch (err) {
      console.error(err);
      setAiErrorMsg(err.response?.data?.detail || 'Failed to submit update request via AI workspace.');
      setAiStep('completed');
    } finally {
      setAiLoading(false);
    }
  };

  if (isCustomer) {
    const customer = customers[0];
    if (loading) {
      return (
        <div className="flex-1 p-8 flex items-center justify-center bg-slate-950">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500 mx-auto"></div>
        </div>
      );
    }
    if (!customer) {
      return (
        <div className="flex-1 p-8 text-center text-slate-500 font-medium bg-slate-950">
          No profile details found.
        </div>
      );
    }
    return (
      <div className="flex-1 p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] bg-slate-950">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">My Profile</h1>
            <p className="text-slate-400 text-xs mt-1">Verify details and submit profile update requests.</p>
          </div>
          <button
            onClick={() => {
              setUpdateRequestFields({ phone: customer.phone || '', address: customer.address || '' });
              setIsUpdateRequestModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600/10 border border-violet-500/30 hover:bg-violet-600/20 text-violet-400 rounded-xl text-xs font-semibold transition-all duration-200"
          >
            <Edit size={14} />
            Request Profile Update
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start max-w-7xl">
          {/* Left Column: Customer Profile Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            {/* Neon background blur */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px]"></div>
            
            <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
              <div className="h-20 w-20 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <User size={36} />
              </div>
              
              <div className="flex-1 space-y-6 text-sm text-white">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Customer ID</p>
                    <p className="text-lg font-bold text-indigo-400 mt-1">{customer.customer_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Profile Status</p>
                    <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                      {customer.status}
                    </span>
                  </div>
                </div>
                
                <div className="border-t border-slate-800/80 pt-6 grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Full Name</p>
                    <p className="font-semibold text-slate-200 mt-1">{customer.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Email Address</p>
                    <p className="text-slate-300 mt-1">{customer.email}</p>
                  </div>
                </div>
                
                <div className="border-t border-slate-800/80 pt-6 grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Phone Number</p>
                    <p className="text-slate-300 mt-1 font-mono">{customer.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Region</p>
                    <p className="text-slate-300 mt-1">{customer.region || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="border-t border-slate-800/80 pt-6">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Billing Address</p>
                  <p className="text-slate-300 mt-1">{customer.address}</p>
                </div>

                {/* Secure Credentials */}
                <div className="border-t border-slate-800/80 pt-6 grid grid-cols-3 gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40 mt-4">
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Aadhaar Number</p>
                    <p className="text-xs text-slate-300 font-mono mt-1">{customer.aadhaar_number || '•••• •••• ••••'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">PAN Number</p>
                    <p className="text-xs text-slate-300 font-mono mt-1">{customer.pan_number || '••••••••••'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Credit Card Number</p>
                    <p className="text-xs text-slate-300 font-mono mt-1">{customer.card_number || '••••-••••-••••-••••'}</p>
                  </div>
                </div>

                {/* Read-only notice */}
                <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-3 flex items-start gap-2">
                  <span className="text-amber-400 text-[10px] mt-0.5">⚠</span>
                  <p className="text-[10px] text-amber-400/80">
                    Your profile is read-only. To update your phone number or billing address, use the <strong className="text-amber-400">Request Profile Update</strong> button above or use the AI Profile Workspace on the right.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: AI profile update workspace */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col space-y-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[80px]"></div>
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
                  <Brain size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100">AI Profile Workspace</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Interact using natural language to propose changes.</p>
                </div>
              </div>

              {/* Suggested Templates */}
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Suggested Prompt Templates</p>
                <div className="flex flex-col gap-2">
                  {[
                    `update my phone to +91 9998887766`,
                    `change my address to 123 Neon Road, Coimbatore`,
                    `update phone to 9123456789 and address to Phase 3, Coimbatore`
                  ].map((tpl) => (
                    <button
                      key={tpl}
                      onClick={() => handleAIGenerate(tpl)}
                      className="text-left px-3 py-2 bg-slate-950 border border-slate-800/80 rounded-xl text-[11px] text-slate-350 hover:bg-slate-850 hover:border-violet-500/40 transition-all font-medium flex items-center gap-2"
                    >
                      <Sparkles size={12} className="text-violet-400 shrink-0" />
                      <span className="truncate">{tpl}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Input Form */}
              <div className="space-y-2 pt-2">
                <label className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Your Request</label>
                <div className="relative">
                  <textarea
                    rows="3"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Type what you want to change, e.g. update my phone to 9876543210..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-3 pr-12 text-slate-200 text-xs focus:border-violet-500 focus:outline-none resize-none transition-all"
                  />
                  <button
                    onClick={() => handleAIGenerate(null)}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="absolute right-3.5 bottom-3.5 h-8 w-8 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white flex items-center justify-center transition-all shadow-lg shadow-violet-600/10"
                    title="Generate Tool Call"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>

              {/* Status / Steps */}
              {aiStep !== 'idle' && (
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-4">
                  {/* Pipeline Steps Indicator */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider pb-2 border-b border-slate-800/60">
                    <span>Execution Pipeline</span>
                    <span className="text-violet-400 capitalize">{aiStep}</span>
                  </div>

                  {/* Tool call view */}
                  {aiToolCall && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Terminal size={12} className="text-violet-400" />
                          Generated Tool Call JSON
                        </span>
                      </div>
                      <pre className="p-3 bg-slate-950 border border-slate-900 rounded-xl text-[10px] font-mono text-violet-300 overflow-x-auto max-h-40">
                        {JSON.stringify(aiToolCall, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Errors / Success */}
                  {aiSuccessMsg && (
                    <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] flex items-start gap-2">
                      <Check size={14} className="shrink-0 mt-0.5" />
                      <span>{aiSuccessMsg}</span>
                    </div>
                  )}
                  {aiErrorMsg && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{aiErrorMsg}</span>
                    </div>
                  )}

                  {/* Execute Button */}
                  {aiStep === 'generated' && (
                    <button
                      onClick={handleAIExecute}
                      className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                      <Play size={12} />
                      Propose Updates to Manager
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PROFILE UPDATE REQUEST MODAL */}
        {isUpdateRequestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 relative shadow-2xl">
              <button
                onClick={() => {
                  setIsUpdateRequestModalOpen(false);
                  setUpdateRequestError('');
                  setUpdateRequestSuccess('');
                }}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
                  <Edit size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-lg">Request Profile Update</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Changes will be reviewed by your regional manager</p>
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800/40 rounded-xl p-3 mb-4 mt-3">
                <p className="text-[10px] text-slate-500">
                  Fill in the fields you want to update. Leave a field blank if you don't want to change it. Your manager will review and either approve or reject the request.
                </p>
              </div>

              {updateRequestSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-2">
                  <Check size={14} />
                  {updateRequestSuccess}
                </div>
              )}
              {updateRequestError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle size={14} />
                  {updateRequestError}
                </div>
              )}

              <form onSubmit={handleSubmitUpdateRequest} className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1.5">
                    New Phone Number <span className="text-slate-600 font-normal">(leave blank to keep current)</span>
                  </label>
                  <input
                    type="text"
                    placeholder={`Current: ${customer.phone}`}
                    value={updateRequestFields.phone}
                    onChange={(e) => setUpdateRequestFields(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:border-violet-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1.5">
                    New Billing Address <span className="text-slate-600 font-normal">(leave blank to keep current)</span>
                  </label>
                  <textarea
                    rows="3"
                    placeholder={`Current: ${customer.address}`}
                    value={updateRequestFields.address}
                    onChange={(e) => setUpdateRequestFields(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-xs focus:border-violet-500 focus:outline-none resize-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updateRequestLoading}
                  className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-semibold mt-2 transition-all"
                >
                  {updateRequestLoading ? 'Submitting...' : 'Submit Update Request'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Customer Roster</h1>
          <p className="text-slate-400 text-xs mt-1">Manage and audit customer profile accounts.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-slate-100 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/10 transition-all duration-200"
        >
          <Plus size={16} />
          Create Customer
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800/80 p-4 rounded-2xl">
        <div className="relative w-full max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={handleSearch}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-slate-200 placeholder-slate-500 text-xs focus:border-indigo-500 focus:outline-none transition-all"
          />
        </div>

        <div className="flex gap-2">
          {['All', 'Approved', 'Suspended', 'Pending'].map((status) => (
            <button
              key={status}
              onClick={() => handleStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === status
                  ? 'bg-indigo-600/10 border border-indigo-500/30 text-indigo-400'
                  : 'bg-slate-950 border border-slate-800/60 text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider select-none">
                <th className="p-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('customer_id')}>Customer ID</th>
                <th className="p-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('full_name')}>Full Name</th>
                <th className="p-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('email')}>Email</th>
                <th className="p-4">Phone</th>
                <th className="p-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('region')}>Region</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-indigo-500 mx-auto"></div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500 font-medium">
                    No customers found matching filters.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-slate-800/20 text-white font-medium">
                    <td className="p-4 font-semibold text-white">{c.customer_id}</td>
                    <td className="p-4 font-medium text-white">{c.full_name}</td>
                    <td className="p-4 text-white">{c.email}</td>
                    <td className="p-4 font-mono text-white">{c.phone}</td>
                    <td className="p-4 text-white">{c.region || 'N/A'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        c.status === 'Approved' ? 'bg-green-500/10 text-green-400' :
                        c.status === 'Suspended' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-1">
                      <button
                        onClick={() => openViewModal(c)}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-400 transition"
                        title="Edit Customer"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.customer_id)}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition"
                        title="Delete Customer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-slate-400 text-xs">
              Showing page {page} of {totalPages} ({total} entries)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-50 rounded-xl transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-50 rounded-xl transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIEW CUSTOMER MODAL */}
      {isViewModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 relative">
            <button
              onClick={() => setIsViewModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-lg">
                <User size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-lg leading-tight">{selectedCustomer.full_name}</h3>
                <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mt-0.5">{selectedCustomer.customer_id}</p>
              </div>
            </div>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 font-medium">Email</p>
                  <p className="text-slate-200 mt-1">{selectedCustomer.email}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Phone</p>
                  <p className="text-slate-200 mt-1 font-mono">{selectedCustomer.phone}</p>
                </div>
              </div>
              <div>
                <p className="text-slate-400 font-medium">Address</p>
                <p className="text-slate-200 mt-1 leading-relaxed">{selectedCustomer.address}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 font-medium">Account Status</p>
                  <p className="text-slate-200 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      selectedCustomer.status === 'Approved' ? 'bg-green-500/10 text-green-400' :
                      selectedCustomer.status === 'Suspended' ? 'bg-rose-500/10 text-rose-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {selectedCustomer.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Created At</p>
                  <p className="text-slate-200 mt-1">{new Date(selectedCustomer.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CUSTOMER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 relative">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
            <h3 className="font-bold text-slate-100 text-lg mb-6">Create New Customer Account</h3>
            {formError && (
              <p className="mb-4 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">{formError}</p>
            )}
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Customer ID</label>
                  <input
                    type="text"
                    required
                    readOnly
                    value={formData.customer_id}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-400 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="Alice Vance"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="alicevance@example.com"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="+1555010001"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Address</label>
                <textarea
                  required
                  rows="2"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  placeholder="100 Innovation Dr, Cyber City, CC 90210"
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Aadhaar Number</label>
                  <input
                    type="text"
                    required
                    value={formData.aadhaar_number}
                    onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="1234 5678 9012"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">PAN Number</label>
                  <input
                    type="text"
                    required
                    value={formData.pan_number}
                    onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="ABCDE1234F"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Credit Card Number</label>
                  <input
                    type="text"
                    required
                    value={formData.card_number}
                    onChange={(e) => setFormData({ ...formData, card_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="1234-5678-9012-3456"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Region</label>
                  {loggedInUser?.role_name === 'Manager' ? (
                    <input
                      type="text"
                      required
                      readOnly
                      value={formData.region}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-slate-400 font-medium focus:outline-none font-sans"
                    />
                  ) : (
                    <select
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="Coimbatore">Coimbatore</option>
                      <option value="Bangalore">Bangalore</option>
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Kochin">Kochin</option>
                      <option value="Kolkata">Kolkata</option>
                    </select>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded-xl font-semibold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-slate-100 rounded-xl font-semibold"
                >
                  {formLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
            <h3 className="font-bold text-slate-100 text-lg mb-6">Modify Customer Account</h3>
            {formError && (
              <p className="mb-4 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">{formError}</p>
            )}
            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Customer ID</label>
                  <input
                    type="text"
                    required
                    readOnly
                    value={formData.customer_id}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-500 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Address</label>
                <textarea
                  required
                  rows="2"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Aadhaar Number</label>
                  <input
                    type="text"
                    required
                    value={formData.aadhaar_number}
                    onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">PAN Number</label>
                  <input
                    type="text"
                    required
                    value={formData.pan_number}
                    onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Credit Card Number</label>
                  <input
                    type="text"
                    required
                    value={formData.card_number}
                    onChange={(e) => setFormData({ ...formData, card_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Region</label>
                  {loggedInUser?.role_name === 'Manager' ? (
                    <input
                      type="text"
                      required
                      readOnly
                      value={formData.region}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-slate-400 font-medium focus:outline-none font-sans"
                    />
                  ) : (
                    <select
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="Coimbatore">Coimbatore</option>
                      <option value="Bangalore">Bangalore</option>
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Kochin">Kochin</option>
                      <option value="Kolkata">Kolkata</option>
                    </select>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Update Password (optional)</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="Leave empty to keep current"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded-xl font-semibold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-slate-100 rounded-xl font-semibold"
                >
                  {formLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
