import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight, X, User } from 'lucide-react';
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
        <div>
          <h1 className="text-2xl font-bold text-slate-100">My Profile</h1>
          <p className="text-slate-400 text-xs mt-1">Verify your customer profile and security records.</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-3xl shadow-2xl relative overflow-hidden">
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
            </div>
          </div>
        </div>
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
