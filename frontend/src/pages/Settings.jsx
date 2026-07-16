import React from 'react';
import { Database, Shield, Sliders, Cpu } from 'lucide-react';

const Settings = () => {
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { full_name: 'Admin', role_name: 'Admin' };

  return (
    <div className="flex-1 p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Gateway Settings</h1>
        <p className="text-slate-400 text-xs mt-1">Configure systemic modules and security integrations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Core Gateway Profiles */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders size={16} className="text-indigo-400" />
            Gateway Profiler
          </h3>
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Current User</span>
              <span className="font-semibold text-slate-200">{user.full_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Authorized Role</span>
              <span className="font-semibold text-indigo-400 font-mono uppercase tracking-wider">{user.role_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Gateway Version</span>
              <span className="font-semibold text-slate-200">v1.0.0-Beta (Phase 1)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Gateway Cluster</span>
              <span className="font-semibold text-green-400">US-EAST-PRIMARY</span>
            </div>
          </div>
        </div>

        {/* Database Config Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Database size={16} className="text-indigo-400" />
            Database Integrations
          </h3>
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Provider</span>
              <span className="font-semibold text-emerald-400">Supabase (PostgreSQL)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Database Engine</span>
              <span className="font-semibold text-slate-200">SQLAlchemy ORM + Psycopg2</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Direct String</span>
              <span className="font-mono text-[10px] text-slate-400 truncate max-w-[180px]">db.effxoocqzqnsohwqanep.supabase.co:5432</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">API Connection</span>
              <span className="font-semibold text-green-400">ONLINE</span>
            </div>
          </div>
        </div>

        {/* Future Integrations Block */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 md:col-span-2">
          <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Shield size={16} className="text-indigo-400" />
            Future Security Integrations (Phase 2 & 3)
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            The following integrations are part of the next development cycles. The current CRM backend has been engineered to support immediate plug-and-play hook mechanisms for these security components.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-xl">
              <h4 className="font-semibold text-slate-300 text-xs flex items-center gap-1.5 mb-1.5">
                <Cpu size={14} className="text-indigo-400" />
                ABAC Engine
              </h4>
              <p className="text-[10px] text-slate-500 leading-normal">Enforce attribute-based permission scopes dynamically across clients.</p>
            </div>
            <div className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-xl">
              <h4 className="font-semibold text-slate-300 text-xs flex items-center gap-1.5 mb-1.5">
                <Shield size={14} className="text-indigo-400" />
                PII Masker
              </h4>
              <p className="text-[10px] text-slate-500 leading-normal">Mask confidential parameters (Aadhaar, Passport, PAN, Bank Details) automatically in responses.</p>
            </div>
            <div className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-xl">
              <h4 className="font-semibold text-slate-300 text-xs flex items-center gap-1.5 mb-1.5">
                <Sliders size={14} className="text-indigo-400" />
                Audit Replays
              </h4>
              <p className="text-[10px] text-slate-500 leading-normal">Record and playback session API requests to identify anomalous bot interactions.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
