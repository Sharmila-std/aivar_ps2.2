import React from 'react';
import AdminPendingTasks from './AdminPendingTasks';
import ManagerPendingTasks from './ManagerPendingTasks';

const PendingTasks = () => {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.role_name || '';

  if (role === 'Admin') {
    return <AdminPendingTasks />;
  } else if (role === 'Manager') {
    return <ManagerPendingTasks />;
  } else {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 p-6">
        <div className="text-center">
          <p className="text-rose-500 font-semibold mb-2">Access Denied</p>
          <p className="text-slate-400 text-sm">You do not have permission to view pending tasks.</p>
        </div>
      </div>
    );
  }
};

export default PendingTasks;
