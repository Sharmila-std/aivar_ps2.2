import React from 'react';

const DashboardCard = ({ title, value, icon: Icon, colorClass, borderClass }) => {
  return (
    <div className={`p-6 rounded-2xl bg-slate-900 border ${borderClass || 'border-slate-800/60'} flex items-center justify-between`}>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold text-slate-100 mt-2">{value}</h3>
      </div>
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colorClass || 'bg-slate-800/40 text-slate-300'}`}>
        <Icon size={22} />
      </div>
    </div>
  );
};

export default DashboardCard;
