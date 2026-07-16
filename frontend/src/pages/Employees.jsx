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

  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    email: '',
    password: '',
    role_id: 1
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

  const openCreateModal = () => {
    setFormData({
      employee_id: 'EMP' + Math.floor(100000 + Math.random() * 900000),
      full_name: '',
      email: '',
      password: '',
      role_id: roles[0]?.role_id || 1
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      employee_id: employee.employee_id,
      full_name: employee.full_name,
      email: employee.email,
      password: '',
      role_id: employee.role_id
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      await api.post('/api/employees', formData);
      setIsCreateModalOpen(false);
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
      const payload = { ...formData };
      if (!payload.password) {
        delete payload.password; // Do not send empty password
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
          Add Employee
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
                <th className="p-4">Assigned Role</th>
                <th className="p-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('region')}>Region</th>
                <th className="p-4">Created Date</th>
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

      {/* CREATE EMPLOYEE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 relative">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
            <h3 className="font-bold text-slate-100 text-lg mb-6">Create New Employee Roster</h3>
            {formError && (
              <p className="mb-4 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">{formError}</p>
            )}
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Employee ID</label>
                  <input
                    type="text"
                    required
                    readOnly
                    value={formData.employee_id}
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
                    placeholder="Bruce Wayne"
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
                    placeholder="bruce.wayne@securescope.ai"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Assign Role</label>
                  <select
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    {roles.map((r) => (
                      <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Login Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  placeholder="••••••••"
                />
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
                  {formLoading ? 'Saving...' : 'Add Personnel'}
                </button>
              </div>
            </form>
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
                  <label className="block text-slate-400 font-medium mb-1">Assign Role</label>
                  <select
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    {roles.map((r) => (
                      <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                    ))}
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
