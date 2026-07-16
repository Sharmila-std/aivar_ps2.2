import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Trash2, 
  RefreshCw, 
  Check, 
  X, 
  Eye, 
  Clock, 
  AlertCircle,
  FileText
} from 'lucide-react';
import api from '../api';

const ManagerPendingTasks = () => {
  const [activeTab, setActiveTab] = useState('creation');
  const [orderCreations, setOrderCreations] = useState([]);
  const [orderDeletions, setOrderDeletions] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal detail overlay
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskType, setTaskType] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'creation') {
        const res = await api.get('/api/orders', {
          params: { status: 'PENDING_CREATE', limit: 100 }
        });
        setOrderCreations(res.data.items || []);
      } else if (activeTab === 'deletion') {
        const res = await api.get('/api/orders', {
          params: { status: 'PENDING_DELETE', limit: 100 }
        });
        setOrderDeletions(res.data.items || []);
      } else {
        const res = await api.get('/api/refunds', {
          params: { status: 'Pending', limit: 100 }
        });
        setRefundRequests(res.data.items || []);
      }
    } catch (err) {
      console.error('Error fetching manager pending tasks', err);
      setError('Failed to fetch regional pending requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeTab]);

  const handleProcessOrder = async (orderId, action) => {
    try {
      await api.put(`/api/orders/pending/${orderId}`, { action });
      setSuccess(`Order creation request was ${action.toLowerCase()} successfully.`);
      setSelectedTask(null);
      fetchTasks();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error(err);
      setError(`Failed to ${action.toLowerCase()} the order request.`);
    }
  };

  const handleProcessOrderDelete = async (orderId, action) => {
    try {
      await api.put(`/api/orders/pending/${orderId}`, { action });
      setSuccess(`Order deletion request was ${action.toLowerCase()} successfully.`);
      setSelectedTask(null);
      fetchTasks();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error(err);
      setError(`Failed to ${action.toLowerCase()} the order deletion request.`);
    }
  };

  const handleProcessRefund = async (refundId, newStatus) => {
    try {
      await api.put(`/api/refunds/${refundId}`, { refund_status: newStatus });
      setSuccess(`Refund request was ${newStatus.toLowerCase()} successfully.`);
      setSelectedTask(null);
      fetchTasks();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error(err);
      setError(`Failed to set refund request to ${newStatus.toLowerCase()}.`);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
          Manager Pending Tasks
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Approve or reject customer order placements, deletions, or refund requests within your region.
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('creation')}
          className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 -mb-[2px] flex items-center gap-2 ${
            activeTab === 'creation'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag size={16} />
          Order Creations
        </button>
        <button
          onClick={() => setActiveTab('deletion')}
          className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 -mb-[2px] flex items-center gap-2 ${
            activeTab === 'deletion'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trash2 size={16} />
          Order Deletions
        </button>
        <button
          onClick={() => setActiveTab('refunds')}
          className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 -mb-[2px] flex items-center gap-2 ${
            activeTab === 'refunds'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <RefreshCw size={16} />
          Refund Requests
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-t-indigo-500 border-slate-800 animate-spin"></div>
        </div>
      ) : activeTab === 'creation' ? (
        // Creations
        orderCreations.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            No pending order creation requests in your region.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orderCreations.map((task) => (
              <div 
                key={task.order_id}
                className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5">
                      <ShoppingBag size={10} />
                      Order Placement
                    </span>
                    <span className="text-xs text-slate-400 font-mono bg-slate-950/60 px-2 py-0.5 rounded">
                      {task.order_id}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
                    {task.product_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Client ID: {task.customer_id}</p>
                  
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-slate-500">Qty: {task.quantity}</p>
                    <p className="text-sm font-bold text-indigo-400">${task.price}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => { setSelectedTask(task); setTaskType('creation'); }}
                    className="flex-1 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs rounded-xl flex items-center justify-center gap-2 transition-all font-medium"
                  >
                    <Eye size={14} />
                    View Details
                  </button>
                  <button
                    onClick={() => handleProcessOrder(task.order_id, 'APPROVE')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl flex items-center justify-center transition-all"
                    title="Approve Order"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleProcessOrder(task.order_id, 'REJECT')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl flex items-center justify-center transition-all"
                    title="Reject Order"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'deletion' ? (
        // Deletions
        orderDeletions.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            No pending order deletion requests in your region.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orderDeletions.map((task) => (
              <div 
                key={task.order_id}
                className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5">
                      <Trash2 size={10} />
                      Order Cancel request
                    </span>
                    <span className="text-xs text-slate-400 font-mono bg-slate-950/60 px-2 py-0.5 rounded">
                      {task.order_id}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
                    {task.product_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Client ID: {task.customer_id}</p>
                  
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-slate-500">Qty: {task.quantity}</p>
                    <p className="text-sm font-bold text-rose-400">${task.price}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => { setSelectedTask(task); setTaskType('deletion'); }}
                    className="flex-1 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs rounded-xl flex items-center justify-center gap-2 transition-all font-medium"
                  >
                    <Eye size={14} />
                    View Details
                  </button>
                  <button
                    onClick={() => handleProcessOrderDelete(task.order_id, 'APPROVE')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl flex items-center justify-center transition-all"
                    title="Confirm Cancel"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleProcessOrderDelete(task.order_id, 'REJECT')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl flex items-center justify-center transition-all"
                    title="Reject Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Refunds
        refundRequests.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            No pending refund requests in your region.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {refundRequests.map((task) => (
              <div 
                key={task.refund_id}
                className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5">
                      <RefreshCw size={10} className="animate-spin" />
                      Refund Pending
                    </span>
                    <span className="text-xs text-slate-400 font-mono bg-slate-950/60 px-2 py-0.5 rounded">
                      {task.refund_id}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
                    Order ID: {task.order_id}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Reason: {task.refund_reason}</p>
                  
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-slate-500">Client ID: {task.customer_id}</p>
                    <p className="text-sm font-bold text-amber-400">${task.refund_amount}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => { setSelectedTask(task); setTaskType('refund'); }}
                    className="flex-1 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs rounded-xl flex items-center justify-center gap-2 transition-all font-medium"
                  >
                    <Eye size={14} />
                    View Details
                  </button>
                  <button
                    onClick={() => handleProcessRefund(task.refund_id, 'Approved')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl flex items-center justify-center transition-all"
                    title="Approve Refund"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleProcessRefund(task.refund_id, 'Rejected')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl flex items-center justify-center transition-all"
                    title="Reject Refund"
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
              {taskType === 'refund' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Refund ID</p>
                    <p className="text-sm font-mono text-indigo-300">{selectedTask.refund_id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Refund Amount</p>
                    <p className="text-sm font-bold text-amber-400">${selectedTask.refund_amount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Order ID</p>
                    <p className="text-sm font-mono text-slate-350">{selectedTask.order_id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Customer ID</p>
                    <p className="text-sm font-mono text-slate-350">{selectedTask.customer_id}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Reason</p>
                    <p className="text-sm font-medium text-slate-300">{selectedTask.refund_reason}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Order ID</p>
                    <p className="text-sm font-mono text-indigo-300">{selectedTask.order_id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Customer ID</p>
                    <p className="text-sm font-mono text-slate-350">{selectedTask.customer_id}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Product Name</p>
                    <p className="text-sm font-semibold text-slate-200">{selectedTask.product_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Quantity</p>
                    <p className="text-sm font-medium text-slate-350">{selectedTask.quantity}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Price</p>
                    <p className="text-sm font-bold text-indigo-400">${selectedTask.price}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Delivery Address</p>
                    <p className="text-xs text-slate-400">{selectedTask.delivery_address}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-950/40 flex justify-end gap-2">
              <button 
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 text-xs font-semibold transition-colors"
              >
                Close
              </button>
              {taskType === 'refund' ? (
                <>
                  <button 
                    onClick={() => handleProcessRefund(selectedTask.refund_id, 'Rejected')}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
                  >
                    Reject Refund
                  </button>
                  <button 
                    onClick={() => handleProcessRefund(selectedTask.refund_id, 'Approved')}
                    className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors"
                  >
                    Approve Refund
                  </button>
                </>
              ) : taskType === 'creation' ? (
                <>
                  <button 
                    onClick={() => handleProcessOrder(selectedTask.order_id, 'REJECT')}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
                  >
                    Reject Placement
                  </button>
                  <button 
                    onClick={() => handleProcessOrder(selectedTask.order_id, 'APPROVE')}
                    className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors"
                  >
                    Approve Placement
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => handleProcessOrderDelete(selectedTask.order_id, 'REJECT')}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
                  >
                    Reject Deletion
                  </button>
                  <button 
                    onClick={() => handleProcessOrderDelete(selectedTask.order_id, 'APPROVE')}
                    className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors"
                  >
                    Approve Deletion
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

export default ManagerPendingTasks;
