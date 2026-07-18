import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingBag, 
  RefreshCw, 
  UserCheck, 
  ShieldAlert, 
  Settings, 
  Database,
  Menu,
  Bot,
  ClipboardList,
  Swords,
  Shield
} from 'lucide-react';
import api from '../api';

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Retrieve user role from localStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.role_name || '';

  const [pendingAlertsCount, setPendingAlertsCount] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

  useEffect(() => {
    if (role === 'Admin') {
      const fetchAlertsCount = async () => {
        try {
          const res = await api.get('/api/alerts', {
            params: { status: 'Pending Investigation', limit: 1 }
          });
          if (res.data) {
            setPendingAlertsCount(res.data.total);
          }
        } catch (err) {
          console.error('Error fetching alerts count', err);
        }
      };
      fetchAlertsCount();
      const timer = setInterval(fetchAlertsCount, 10000);
      return () => clearInterval(timer);
    }
  }, [role]);

  useEffect(() => {
    if (role === 'Manager') {
      const fetchManagerTasks = async () => {
        try {
          const creationsRes = await api.get('/api/orders', { params: { status: 'Placed', limit: 100 } });
          const cancellationsRes = await api.get('/api/orders', { params: { status: 'PENDING_DELETE', limit: 100 } });
          const updatesRes = await api.get('/api/customers/pending-updates');
          
          const total = (creationsRes.data.items || []).length + 
                        (cancellationsRes.data.items || []).length + 
                        (updatesRes.data || []).length;
          setPendingTasksCount(total);
        } catch (err) {
          console.error('Error fetching manager tasks count', err);
        }
      };
      fetchManagerTasks();
      const timer = setInterval(fetchManagerTasks, 10000);
      return () => clearInterval(timer);
    } else if (role === 'Admin') {
      const fetchAdminTasks = async () => {
        try {
          const regsRes = await api.get('/api/customers/pending');
          const pendingRegs = (regsRes.data || []).filter(r => r.request_status === 'Pending');

          const updatesRes = await api.get('/api/customers/pending-updates');
          const allUpdates = updatesRes.data || [];
          const deletionTasks = allUpdates.filter(t => {
            if (t.request_status !== 'Pending') return false;
            try {
              const updates = typeof t.updates_json === 'string' ? JSON.parse(t.updates_json) : (t.updates || {});
              return updates.status === 'PENDING_DELETE';
            } catch { return false; }
          });

          setPendingTasksCount(pendingRegs.length + deletionTasks.length);
        } catch (err) {
          console.error('Error fetching admin tasks count', err);
        }
      };
      fetchAdminTasks();
      const timer = setInterval(fetchAdminTasks, 10000);
      return () => clearInterval(timer);
    }
  }, [role]);

  let menuItems = [];

  if (role === 'Customer') {
    menuItems = [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'AI Workspace', path: '/ai-workspace', icon: Bot },
      { name: 'My Profile', path: '/customers', icon: Users },
      { name: 'My Orders', path: '/orders', icon: ShoppingBag },
      { name: 'Settings', path: '/settings', icon: Settings },
    ];
  } else if (role === 'Manager') {
    menuItems = [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'AI Workspace', path: '/ai-workspace', icon: Bot },
      { name: 'Customers', path: '/customers', icon: Users },
      { name: 'Orders', path: '/orders', icon: ShoppingBag },
      { name: 'Pending Tasks', path: '/pending-tasks', icon: ClipboardList },
      { name: 'Settings', path: '/settings', icon: Settings },
    ];
  } else {
    // Admin, HR, Finance, Support, etc.
    menuItems = [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'AI Workspace', path: '/ai-workspace', icon: Bot },
      { name: 'Customers', path: '/customers', icon: Users },
      { name: 'Orders', path: '/orders', icon: ShoppingBag },
      { name: 'Employees', path: '/employees', icon: UserCheck },
      { name: 'Pending Tasks', path: '/pending-tasks', icon: ClipboardList },
      { name: 'Security & Roles', path: '/roles', icon: ShieldAlert },
    ];
    if (role === 'Admin') {
      menuItems.push({ name: '🛡 Attack Replay', path: '/attack-replay', icon: Swords });
      menuItems.push({ name: '🛡 Policy Simulator', path: '/policy-simulator', icon: Shield });
    }
    menuItems.push({ name: 'Settings', path: '/settings', icon: Settings });
  }

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-between p-1 text-white font-bold text-sm">
            SG
          </div>
          <div>
            <h1 className="font-semibold text-slate-100 text-sm leading-tight">Security Gateway</h1>
            <span className="text-[10px] text-indigo-400 font-medium tracking-wider uppercase">CRM Backend</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-slate-400'} />
                {item.name}
              </div>
              {item.name === 'Security & Roles' && pendingAlertsCount > 0 && (
                <span className="h-5 min-w-5 px-1 bg-rose-600 border border-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {pendingAlertsCount}
                </span>
              )}
              {item.name === 'Pending Tasks' && pendingTasksCount > 0 && (
                <span className="h-5 min-w-5 px-1 bg-rose-600 border border-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {pendingTasksCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 p-2 bg-slate-950/40 rounded-xl border border-slate-800/40">
          <div className="h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs uppercase">
            DB
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-300 truncate">MongoDB Atlas</p>
            <p className="text-[10px] text-green-500 font-semibold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse"></span>
              Connected
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
