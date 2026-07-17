import React, { useState, useEffect } from 'react';
import { Users, ShoppingBag, UserCheck, Clock, AlertTriangle } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import api from '../api';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingAlerts, setPendingAlerts] = useState(0);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role_name === 'Admin';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/api/dashboard');
        setData(res.data);
        
        if (isAdmin) {
          const alertRes = await api.get('/api/alerts', {
            params: { status: 'Pending Investigation', limit: 1 }
          });
          setPendingAlerts(alertRes.data.total);
        }
      } catch (err) {
        setError('Failed to fetch dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      </div>
    );
  }

  const { kpis, recent_customers, recent_orders } = data;

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-4rem)]">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Workspace Dashboard</h1>
        <p className="text-slate-400 text-xs mt-1">Real-time overview of your enterprise CRM resources and activities.</p>
      </div>

      {isAdmin && pendingAlerts > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-5 rounded-2xl flex items-center justify-between gap-4 shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-rose-500 shrink-0 animate-bounce" size={20} />
            <div>
              <p className="text-rose-400 font-bold text-xs">Unresolved Security Incidents Detected</p>
              <p className="text-slate-400 text-[10px] mt-0.5 font-medium">There are {pendingAlerts} pending policy violations requiring review in the incident logs.</p>
            </div>
          </div>
          <a
            href="/roles"
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-slate-100 rounded-xl text-[10px] font-bold tracking-wider transition shrink-0 uppercase"
          >
            Investigate
          </a>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard 
          title="Total Customers" 
          value={kpis.total_customers} 
          icon={Users} 
          colorClass="bg-indigo-500/10 text-indigo-400"
          borderClass="border-indigo-500/10"
        />
        <DashboardCard 
          title="Total Orders" 
          value={kpis.total_orders} 
          icon={ShoppingBag} 
          colorClass="bg-emerald-500/10 text-emerald-400"
          borderClass="border-emerald-500/10"
        />
        <DashboardCard 
          title="Total Employees" 
          value={kpis.total_employees} 
          icon={UserCheck} 
          colorClass="bg-violet-500/10 text-violet-400"
          borderClass="border-violet-500/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-indigo-400" />
              Recent Orders
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Order ID</th>
                  <th className="pb-3">Customer ID</th>
                  <th className="pb-3">Product</th>
                  <th className="pb-3 text-right">Price</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {recent_orders.map((o) => (
                  <tr key={o.order_id} className="text-slate-300">
                    <td className="py-3 font-semibold text-indigo-400">{o.order_id}</td>
                    <td className="py-3 text-slate-400">{o.customer_id}</td>
                    <td className="py-3 font-medium truncate max-w-[120px]">{o.product_name}</td>
                    <td className="py-3 text-right font-semibold">${o.price.toFixed(2)}</td>
                    <td className="py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        o.order_status === 'Delivered' ? 'bg-green-500/10 text-green-400' :
                        o.order_status === 'Shipped' ? 'bg-blue-500/10 text-blue-400' :
                        o.order_status === 'Cancelled' ? 'bg-red-500/10 text-red-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {o.order_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Registered Customers */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2 mb-4">
            <Users size={16} className="text-indigo-400" />
            Recent Registered Customers
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Customer ID</th>
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {recent_customers.map((c) => (
                  <tr key={c.customer_id} className="text-slate-300">
                    <td className="py-3 font-semibold text-indigo-400">{c.customer_id}</td>
                    <td className="py-3 font-medium text-slate-200 truncate max-w-[100px]">{c.full_name}</td>
                    <td className="py-3 text-slate-400 truncate max-w-[120px]">{c.email}</td>
                    <td className="py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        c.status === 'Approved' ? 'bg-green-500/10 text-green-400' :
                        c.status === 'Suspended' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
