import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, ShieldAlert, X } from 'lucide-react';
import api from '../api';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('employee_id');
  const [sortDesc, setSortDesc] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 8;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    email: '',
    password: '',
    role_id: 1,
    region: 'Coimbatore',
    phone: '',
    address: '',
    aadhaar_number: '',
    pan_number: '',
    card_number: '',
    selected_role_type: 'Manager' // Customer or Manager
  });

  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * limit;
      const empRes = await api.get('/api/employees', {
        params: {
          search: search || undefined,
          sort_by: sortBy,
          sort_desc: sortDesc,
          skip,
          limit
        }
      });
      setEmployees(empRes.data.items);
      setTotal(empRes.data.total);

      const rolesRes = await api.get('/api/roles');
      setRoles(rolesRes.data);
    } catch (err) {
      console.error('Error fetching employees/roles', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, sortBy, sortDesc, page]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
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

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const openCreateModal = () => {
    const managerRole = roles.find(r => r.role_name.toLowerCase() === 'manager');
    setFormData({
      employee_id: 'EMP' + Math.floor(100000 + Math.random() * 900000),
      full_name: '',
      email: '',
      password: generateRandomPassword(),
      role_id: managerRole?.role_id || 1,
      region: 'Coimbatore',
      phone: '',
      address: '',
      aadhaar_number: '',
      pan_number: '',
      card_number: '',
      selected_role_type: 'Manager'
    });
    setFormError('');
    setSuccessMessage(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      employee_id: employee.employee_id,
      full_name: employee.full_name,
      email: employee.email,
      password: '',
      role_id: employee.role_id,
      region: employee.region || 'Coimbatore',
      phone: '',
      address: '',
      aadhaar_number: '',
      pan_number: '',
      card_number: '',
      selected_role_type: 'Manager'
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage(null);
    setFormLoading(true);
    try {
      let loginId = '';
      if (formData.selected_role_type === 'Customer') {
        const customerId = 'CUS' + Math.floor(100000 + Math.random() * 900000);
        loginId = customerId;
        const payload = {
          customer_id: customerId,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || '+1555000000',
          address: formData.address || 'Default Address',
          region: formData.region,
          password: formData.password,
          status: 'Approved',
          aadhaar_number: formData.aadhaar_number || null,
          pan_number: formData.pan_number || null,
          card_number: formData.card_number || null
        };
        await api.post('/api/customers', payload);
      } else {
        loginId = formData.employee_id;
        const managerRole = roles.find(r => r.role_name.toLowerCase() === 'manager');
        const payload = {
          employee_id: formData.employee_id,
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
          role_id: managerRole ? managerRole.role_id : formData.role_id,
          region: formData.region,
          role: 'Manager'
        };
        await api.post('/api/employees', payload);
      }
      
      setSuccessMessage({
        loginId: loginId,
        password: formData.password,
        email: formData.email,
        role: formData.selected_role_type
      });
      fetchEmployees();
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
      const payload = {
        employee_id: formData.employee_id,
        full_name: formData.full_name,
        email: formData.email,
        role_id: formData.role_id,
        region: formData.region
      };
      if (formData.password) {
        payload.password = formData.password;
      }
      await api.put(`/api/employees/${selectedEmployee.employee_id}`, payload);
      setIsEditModalOpen(false);
      fetchEmployees();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Validation error occurred.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (employeeId) => {
    if (window.confirm(`Are you sure you want to delete employee ${employeeId}?`)) {
      try {
        await api.delete(`/api/employees/${employeeId}`);
        fetchEmployees();
      } catch (err) {
        alert('Failed to delete employee.');
      }
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex-1 p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Administrative Roster</h1>
          <p className="text-slate-400 text-xs mt-1">Manage corporate personnel accounts and access scopes.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-slate-100 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/10 transition-all"
        >
          <Plus size={16} />
          Add Personnel
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="relative w-full max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by name, email, employee ID..."
            value={search}
            onChange={handleSearch}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-slate-200 placeholder-slate-500 text-xs focus:border-indigo-500 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider select-none">
                <th className="p-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('employee_id')}>Employee ID</th>
                <th className="p-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('full_name')}>Full Name</th>
                <th className="p-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('email')}>Corporate Email</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Assigned Role</th>
                <th className="p-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('region')}>Region</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Created Date</th>
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
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500 font-medium">
                    No employees found matching filters.
                  </td>
                </tr>
              ) : (
                employees.map((e) => (
                  <tr key={e.employee_id} className="hover:bg-slate-800/20 text-white">
                    <td className="p-4 font-semibold text-white">{e.employee_id}</td>
                    <td className="p-4 font-medium text-white">{e.full_name}</td>
                    <td className="p-4 text-white">{e.email}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 border border-slate-700/60 font-semibold text-white capitalize">
                        {typeof e.role === 'object' ? (e.role?.role_name || 'Support') : (e.role || 'Support')}
                      </span>
                    </td>
                    <td className="p-4 text-white font-medium">{e.region || 'N/A'}</td>
                    <td className="p-4 text-white">{new Date(e.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(e)}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-400 transition"
                        title="Edit Employee Access"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(e.employee_id)}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition"
                        title="Delete Account"
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
      </div>

      {/* CREATE PERSONNEL MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
            <h3 className="font-bold text-slate-100 text-lg mb-6">Add New Account</h3>
            {formError && (
              <p className="mb-4 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">{formError}</p>
            )}
            {successMessage ? (
              <div className="space-y-6 text-xs text-white">
                <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl flex items-start gap-3">
                  <Check size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Account Created Successfully!</h4>
                    <p className="text-[11px] text-green-400/80 mt-0.5">The credentials have been dispatched to their email address.</p>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3 font-medium">
                  <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-900">
                    <span className="text-slate-500">Account Type:</span>
                    <span className="text-indigo-400 font-semibold">{successMessage.role}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-900">
                    <span className="text-slate-500">Username / ID:</span>
                    <span className="text-slate-200 font-mono font-bold select-all">{successMessage.loginId}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-900">
                    <span className="text-slate-500">Temporary Password:</span>
                    <span className="text-slate-200 font-mono font-bold select-all">{successMessage.password}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-slate-500">Corporate Email:</span>
                    <span className="text-slate-350 truncate">{successMessage.email}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setSuccessMessage(null);
                    }}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Assign Role Option</label>
                    <select
                      value={formData.selected_role_type}
                      onChange={(e) => setFormData({ ...formData, selected_role_type: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="Manager">Manager</option>
                      <option value="Customer">Customer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Region</label>
                    <select
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="Coimbatore">Coimbatore</option>
                      <option value="Bangalore">Bangalore</option>
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Kochin">Kochin</option>
                      <option value="Kolkata">Kolkata</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">
                      {formData.selected_role_type === 'Customer' ? 'Customer ID' : 'Employee ID'}
                    </label>
                    <input
                      type="text"
                      required
                      readOnly
                      value={formData.selected_role_type === 'Customer' ? 'Auto-generated' : formData.employee_id}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-500 font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                      placeholder="Alice Vance"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                      placeholder="alice.vance@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {formData.selected_role_type === 'Customer' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Phone Number</label>
                        <input
                          type="text"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                          placeholder="+1555010001"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Billing Address</label>
                        <input
                          type="text"
                          required
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                          placeholder="123 Tech Blvd, Bangalore"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Aadhaar</label>
                        <input
                          type="text"
                          value={formData.aadhaar_number}
                          onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                          placeholder="1234 5678 9012"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">PAN</label>
                        <input
                          type="text"
                          value={formData.pan_number}
                          onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                          placeholder="ABCDE1234F"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">Card Number</label>
                        <input
                          type="text"
                          value={formData.card_number}
                          onChange={(e) => setFormData({ ...formData, card_number: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                          placeholder="1234-5678-9012-3456"
                        />
                      </div>
                    </div>
                  </>
                )}

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
                    {formLoading ? 'Saving...' : 'Add Personnel'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
            <h3 className="font-bold text-slate-100 text-lg mb-6">Modify Personnel Access</h3>
            {formError && (
              <p className="mb-4 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">{formError}</p>
            )}
            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Employee ID</label>
                  <input
                    type="text"
                    required
                    readOnly
                    value={formData.employee_id}
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
                  <label className="block text-slate-400 font-medium mb-1">Corporate Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Region</label>
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
                </div>
              </div>
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

export default Employees;
