import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Key } from 'lucide-react';

const TopNav = () => {
  const navigate = useNavigate();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { full_name: 'Employee', role_name: 'Support' };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-8">
      <div>
        <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Enterprise CRM Dashboard</h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 bg-slate-800/30 px-3 py-1.5 rounded-full border border-slate-800/40">
          <div className="h-7 w-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <User size={14} />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-200">{user.full_name}</p>
            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest leading-none">{user.role_name}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-400 text-xs font-semibold hover:bg-rose-500/10 hover:border-rose-500/50 transition-all duration-200"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </header>
  );
};

export default TopNav;
