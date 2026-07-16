import React, { useState, useEffect } from 'react';
import { Search, Eye, ChevronLeft, ChevronRight, X, ShoppingBag } from 'lucide-react';
import api from '../api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('order_date');
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 8;

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * limit;
      const res = await api.get('/api/orders', {
        params: {
          search: search || undefined,
          status: statusFilter !== 'All' ? statusFilter : undefined,
          sort_by: sortBy,
          sort_desc: sortDesc,
          skip,
          limit
        }
      });
      setOrders(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Error fetching orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
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

  const openViewModal = async (order) => {
    try {
      // Fetch full order with items
      const res = await api.get(`/api/orders/${order.order_id}`);
      setSelectedOrder(res.data);
      setIsViewModalOpen(true);
    } catch (err) {
      console.error('Error fetching order items', err);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex-1 p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Order Logs</h1>
        <p className="text-slate-400 text-xs mt-1">Audit customer purchase transactions and delivery status.</p>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800/80 p-4 rounded-2xl">
        <div className="relative w-full max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by order ID, customer ID, product..."
            value={search}
            onChange={handleSearch}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-slate-200 placeholder-slate-500 text-xs focus:border-indigo-500 focus:outline-none transition-all"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {['All', 'Delivered', 'Shipped', 'Pending', 'Cancelled'].map((status) => (
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

      {/* Table Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider select-none">
                <th className="p-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('order_id')}>Order ID</th>
                <th className="p-4 cursor-pointer hover:text-slate-200" onClick={() => handleSort('customer_id')}>Customer ID</th>
                <th className="p-4">Primary Product</th>
                <th className="p-4 cursor-pointer hover:text-slate-200 text-right" onClick={() => handleSort('price')}>Total Price</th>
                <th className="p-4 cursor-pointer hover:text-slate-200 text-right" onClick={() => handleSort('order_status')}>Status</th>
                <th className="p-4 cursor-pointer hover:text-slate-200 text-right" onClick={() => handleSort('order_date')}>Date</th>
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
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500 font-medium">
                    No orders found matching filters.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.order_id} className="hover:bg-slate-800/20 text-slate-300">
                    <td className="p-4 font-semibold text-indigo-400">{o.order_id}</td>
                    <td className="p-4 text-slate-400">{o.customer_id}</td>
                    <td className="p-4 font-medium text-slate-200 truncate max-w-[200px]">{o.product_name}</td>
                    <td className="p-4 text-right font-semibold text-slate-100">${Number(o.price).toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        o.order_status === 'Delivered' ? 'bg-green-500/10 text-green-400' :
                        o.order_status === 'Shipped' ? 'bg-blue-500/10 text-blue-400' :
                        o.order_status === 'Cancelled' ? 'bg-red-500/10 text-red-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {o.order_status}
                      </span>
                    </td>
                    <td className="p-4 text-right text-slate-400">{new Date(o.order_date).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openViewModal(o)}
                        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
                        title="View Purchase Details"
                      >
                        <Eye size={14} />
                      </button>
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

      {/* VIEW ORDER DETAILS MODAL */}
      {isViewModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 relative shadow-2xl">
            <button
              onClick={() => setIsViewModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <ShoppingBag size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-lg leading-tight">Order Details</h3>
                <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mt-0.5">{selectedOrder.order_id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs mb-6 bg-slate-950/40 p-4 rounded-xl border border-slate-800/40">
              <div className="space-y-2">
                <p className="text-slate-400"><strong className="text-slate-300">Customer ID:</strong> {selectedOrder.customer_id}</p>
                <p className="text-slate-400"><strong className="text-slate-300">Order Date:</strong> {new Date(selectedOrder.order_date).toLocaleString()}</p>
                <p className="text-slate-400"><strong className="text-slate-300">Payment Status:</strong> {selectedOrder.payment_status}</p>
              </div>
              <div className="space-y-2">
                <p className="text-slate-400"><strong className="text-slate-300">Status:</strong> {selectedOrder.order_status}</p>
                <p className="text-slate-400"><strong className="text-slate-300">Payment Method:</strong> {selectedOrder.payment_method}</p>
                <p className="text-slate-400"><strong className="text-slate-300">Shipping Address:</strong> {selectedOrder.delivery_address}</p>
              </div>
            </div>

            <h4 className="font-bold text-slate-300 text-xs uppercase tracking-wider mb-3">Itemized Products</h4>
            <div className="border border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold">
                    <th className="p-3">Product Name</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/10">
                        <td className="p-3 font-medium text-slate-200">{item.product_name}</td>
                        <td className="p-3 text-center">{item.quantity}</td>
                        <td className="p-3 text-right">${item.unit_price}</td>
                        <td className="p-3 text-right font-semibold">${item.subtotal}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-slate-500 font-medium">
                        No product items attached. Showing primary: <strong className="text-slate-300">{selectedOrder.product_name}</strong>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-800/80">
              <p className="text-slate-400 text-xs">Total Order Value:</p>
              <p className="text-xl font-bold text-slate-100">${Number(selectedOrder.price).toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
