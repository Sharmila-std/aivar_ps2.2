import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Trash2, 
  User,
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
  const [profileUpdates, setProfileUpdates] = useState([]);
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
          params: { status: 'Placed', limit: 100 }
        });
        setOrderCreations(res.data.items || []);
      } else if (activeTab === 'deletion') {
        const res = await api.get('/api/orders', {
          params: { status: 'PENDING_DELETE', limit: 100 }
        });
        setOrderDeletions(res.data.items || []);
      } else if (activeTab === 'profile_updates') {
        const res = await api.get('/api/customers/pending-updates');
        setProfileUpdates(res.data || []);
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
      setSuccess(`Order creation request was ${action.toLowerCase()}d successfully.`);
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
      setSuccess(`Order cancellation request was ${action.toLowerCase()}d successfully.`);
      setSelectedTask(null);
      fetchTasks();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error(err);
      setError(`Failed to ${action.toLowerCase()} the order cancellation request.`);
    }
  };

  const handleProcessProfileUpdate = async (requestId, action) => {
    try {
      await api.put(`/api/customers/pending-updates/${requestId}`, { action });
      setSuccess(`Profile update request was ${action.toLowerCase()}d successfully.`);
      setSelectedTask(null);
      fetchTasks();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error(err);
      setError(`Failed to ${action.toLowerCase()} the profile update request.`);
    }
  };

  const getTaskUpdates = (task) => {
    if (!task) return {};
    if (task.updates && Object.keys(task.updates).length > 0) {
      return task.updates;
    }
    if (task.updates_json) {
      try {
        return JSON.parse(task.updates_json);
      } catch (e) {
        console.error(e);
      }
    }
    return {};
  };

  const tabs = [
    { key: 'creation', label: 'Order Creations', icon: ShoppingBag },
    { key: 'deletion', label: 'Order Cancellations', icon: Trash2 },
    { key: 'profile_updates', label: 'Profile Update Requests', icon: User },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
          Manager Pending Tasks
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Approve or reject customer order placements, cancellations, or profile update requests within your region.
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
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 border-b-2 -mb-[2px] flex items-center gap-2 ${
              activeTab === key
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-t-indigo-500 border-slate-800 animate-spin"></div>
        </div>
      ) : activeTab === 'creation' ? (
        // Order Creations
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
        // Order Cancellations
        orderDeletions.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            No pending order cancellation requests in your region.
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
                      Cancellation Request
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
                    title="Confirm Cancellation"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleProcessOrderDelete(task.order_id, 'REJECT')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl flex items-center justify-center transition-all"
                    title="Reject Cancellation"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // Profile Update Requests
        profileUpdates.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            No pending profile update requests in your region.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profileUpdates.map((task) => (
              <div 
                key={task.request_id || task.id}
                className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    {(() => {
                      const isDeletion = task.updates_json && (task.updates_json.includes('"status": "PENDING_DELETE"') || task.updates_json.includes('"action": "DELETE"'));
                      return (
                        <span className={`text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full uppercase flex items-center gap-1.5 ${isDeletion ? 'text-rose-400 bg-rose-500/10' : 'text-violet-400 bg-violet-500/10'}`}>
                          {isDeletion ? <Trash2 size={10} /> : <User size={10} />}
                          {isDeletion ? 'Customer Deletion' : 'Profile Update'}
                        </span>
                      );
                    })()}
                    <span className="text-xs text-slate-400 font-mono bg-slate-950/60 px-2 py-0.5 rounded">
                      {task.customer_id}
                    </span>
                  </div>
                  <div className="space-y-2 mt-2">
                    {Object.entries(getTaskUpdates(task)).map(([field, value]) => (
                      <div key={field} className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 uppercase tracking-wider font-semibold min-w-[80px]">{field}:</span>
                        <span className="text-slate-300 font-medium truncate">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                    <Clock size={10} />
                    Requested: {task.created_at ? new Date(task.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => { setSelectedTask(task); setTaskType('profile_update'); }}
                    className="flex-1 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs rounded-xl flex items-center justify-center gap-2 transition-all font-medium"
                  >
                    <Eye size={14} />
                    View Details
                  </button>
                  <button
                    onClick={() => handleProcessProfileUpdate(task.request_id || task.id, 'APPROVE')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl flex items-center justify-center transition-all"
                    title="Approve Profile Update"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleProcessProfileUpdate(task.request_id || task.id, 'REJECT')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl flex items-center justify-center transition-all"
                    title="Reject Profile Update"
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
              {taskType === 'profile_update' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Request ID</p>
                      <p className="text-sm font-mono text-indigo-300">#{selectedTask.request_id || selectedTask.id}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Customer ID</p>
                      <p className="text-sm font-mono text-slate-300">{selectedTask.customer_id}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Status</p>
                      <p className="text-sm font-medium text-amber-400">{selectedTask.status}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Submitted</p>
                      <p className="text-sm text-slate-400">{selectedTask.created_at ? new Date(selectedTask.created_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Requested Changes</p>
                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
                      {Object.entries(getTaskUpdates(selectedTask)).map(([field, value]) => (
                        <div key={field} className="flex items-start gap-3">
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold min-w-[100px] pt-0.5">{field}</span>
                          <span className="text-sm text-violet-300 font-medium break-all">{String(value)}</span>
                        </div>
                      ))}
                    </div>
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
              {taskType === 'profile_update' ? (
                (() => {
                  const isDeletion = selectedTask.updates_json && (selectedTask.updates_json.includes('"status": "PENDING_DELETE"') || selectedTask.updates_json.includes('"action": "DELETE"'));
                  return (
                    <>
                      <button 
                        onClick={() => handleProcessProfileUpdate(selectedTask.request_id || selectedTask.id, 'REJECT')}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
                      >
                        {isDeletion ? 'Reject Deletion' : 'Reject Update'}
                      </button>
                      <button 
                        onClick={() => handleProcessProfileUpdate(selectedTask.request_id || selectedTask.id, 'APPROVE')}
                        className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors"
                      >
                        {isDeletion ? 'Approve Deletion' : 'Approve Update'}
                      </button>
                    </>
                  );
                })()
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
                    Reject Cancellation
                  </button>
                  <button 
                    onClick={() => handleProcessOrderDelete(selectedTask.order_id, 'APPROVE')}
                    className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors"
                  >
                    Approve Cancellation
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
