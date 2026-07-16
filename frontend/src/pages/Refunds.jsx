import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import api from '../api';

const Refunds = () => {
  const [refunds, setRefunds] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 8;

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * limit;
      const res = await api.get('/api/refunds', {
        params: {
          search: search || undefined,
          status: statusFilter !== 'All' ? statusFilter : undefined,
          sort_by: sortBy,
          sort_desc: sortDesc,
          skip,
          limit
        }
      });
      setRefunds(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Error fetching refunds', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
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

  const handleStatusUpdate = async (refundId, newStatus) => {
    if (window.confirm(`Are you sure you want to set refund ${refundId} status to ${newStatus}?`)) {
      try {
        await api.put(`/api/refunds/${refundId}`, { refund_status: newStatus });
        fetchRefunds();
      } catch (err) {
        alert('Failed to update refund status.');
      }
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex-1 p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Refund Claims</h1>
        <p className="text-slate-400 text-xs mt-1">Audit, approve, or reject customer billing refund tickets.</p>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800/80 p-4 rounded-2xl">
        <div className="relative w-full max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by refund ID, order ID, reason..."
            value={search}
            onChange={handleSearch}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-slate-200 placeholder-slate-500 text-xs focus:border-indigo-500 focus:outline-none transition-all"
          />
        </div>

        <div className="flex gap-2">
          {['All', 'Approved', 'Rejected', 'Pending'].map((status) => (
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
                <th className="p-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('refund_id')}>Refund ID</th>
                <th className="p-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('order_id')}>Order ID</th>
                <th className="p-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('customer_id')}>Customer ID</th>
                <th className="p-4">Reason</th>
                <th className="p-4 cursor-pointer hover:text-slate-200 text-right" onClick={() => handleSort('refund_amount')}>Amount</th>
                <th className="p-4 cursor-pointer hover:text-slate-200 text-right" onClick={() => handleSort('refund_status')}>Status</th>
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
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500 font-medium">
                    No refunds found matching filters.
                  </td>
                </tr>
              ) : (
                refunds.map((r) => (
                  <tr key={r.refund_id} className="hover:bg-slate-800/20 text-slate-300">
                    <td className="p-4 font-semibold text-indigo-400">{r.refund_id}</td>
                    <td className="p-4 font-semibold text-slate-400">{r.order_id}</td>
                    <td className="p-4 text-slate-400">{r.customer_id}</td>
                    <td className="p-4 font-medium text-slate-200 truncate max-w-[200px]" title={r.refund_reason}>{r.refund_reason}</td>
                    <td className="p-4 text-right font-semibold text-slate-100">${Number(r.refund_amount).toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        r.refund_status === 'Approved' ? 'bg-green-500/10 text-green-400' :
                        r.refund_status === 'Rejected' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {r.refund_status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {r.refund_status === 'Pending' ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleStatusUpdate(r.refund_id, 'Approved')}
                            className="p-1.5 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 rounded-lg text-green-400 transition"
                            title="Approve Refund"
                          >
                            <CheckCircle2 size={13} />
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(r.refund_id, 'Rejected')}
                            className="p-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded-lg text-rose-400 transition"
                            title="Reject Refund"
                          >
                            <XCircle size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[10px] italic">Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
    </div>
  );
};

export default Refunds;
