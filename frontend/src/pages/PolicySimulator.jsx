import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, Play, Search, Filter, RefreshCw,
  AlertTriangle, XCircle, CheckCircle2, ChevronRight,
  Download, ArrowLeftRight, Check, X, Info
} from 'lucide-react';
import api from '../api';

const CUSTOMER_OPTIONS = [
  "Read Own Profile",
  "View Own Orders",
  "Create Order Request",
  "Delete Order Request",
  "Update Profile Request",
  "Read Other Customers",
  "Delete Customers",
  "Update Customer Records",
  "Approve Requests",
  "View Employees",
  "Access Security Dashboard",
  "Access AI Workspace",
  "Export Data",
  "Read Admin Data",
  "Read Managers Data",
  "Update Their Own Account",
  "Delete Their Own Account"
];

const MANAGER_OPTIONS = [
  "Read Regional Customers",
  "Approve Orders",
  "Approve Customer Updates",
  "Create Customer",
  "Delete Customer",
  "View Pending Requests",
  "Access Security Dashboard",
  "Modify Permission Manifest",
  "Disable Users",
  "Unlock Accounts",
  "Export Audit Logs",
  "View Cross Region Customers",
  "Delete Cross Region Customers",
  "Update Customer Records",
  "View Admin Details"
];

const ALLOW_RULES = [
  "Customer can only access own profile",
  "Manager limited to own region",
  "Customer can create order requests",
  "Manager can approve pending requests",
  "Admin unrestricted"
];

const DENY_RULES = [
  "Deny Cross Region Access",
  "Deny Direct Customer Creation",
  "Deny Customer Delete",
  "Deny Unauthorized Tool Calls",
  "Deny PII Access",
  "Deny Privilege Escalation",
  "Deny Direct Database Operations"
];

const ROLES = ['All', 'Customer', 'Manager', 'Admin'];
const REGIONS = ['All', 'Coimbatore', 'Bangalore', 'Hyderabad', 'Kochin', 'Kolkata'];
const CATEGORIES = ['All', 'Cross Region Access', 'Ownership Violation', 'Privilege Escalation',
  'PII Access Attempt', 'Prompt Injection', 'Threat Threshold Violation',
  'Permission Violation', 'ABAC Policy Violation', 'Security Policy Violation'];

export default function PolicySimulator() {
  // Live Settings (loaded from backend)
  const [liveSettings, setLiveSettings] = useState({
    customer_permissions: [],
    manager_permissions: [],
    allow_rules: [],
    deny_rules: []
  });

  // Simulated Settings
  const [simCustomerPerms, setSimCustomerPerms] = useState([]);
  const [simManagerPerms, setSimManagerPerms] = useState([]);
  const [simAllowRules, setSimAllowRules] = useState([]);
  const [simDenyRules, setSimDenyRules] = useState([]);

  // Simulation settings
  const [logLimit, setLogLimit] = useState(100);
  const [customLimit, setCustomLimit] = useState('');
  const [filters, setFilters] = useState({
    user_role: 'All',
    region: 'All',
    attack_category: 'All',
    tool: 'All',
    operation: 'All',
    allowed_requests: true,
    blocked_requests: true
  });

  const [loading, setLoading] = useState(false);
  const [simRun, setSimRun] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, changed

  // Fetch live settings on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/policy-simulator/live-settings');
        setLiveSettings(res.data);
        // Pre-populate simulated settings with live settings
        setSimCustomerPerms(res.data.customer_permissions);
        setSimManagerPerms(res.data.manager_permissions);
        setSimAllowRules(res.data.allow_rules);
        setSimDenyRules(res.data.deny_rules);
      } catch (err) {
        setError(err?.response?.data?.detail || 'Failed to load live security policy settings.');
      }
    })();
  }, []);

  const handleSimRun = async () => {
    setLoading(true);
    setError('');
    const finalLimit = logLimit === -1 ? (parseInt(customLimit) || 100) : logLimit;
    
    try {
      const payload = {
        customer_permissions: simCustomerPerms,
        manager_permissions: simManagerPerms,
        allow_rules: simAllowRules,
        deny_rules: simDenyRules,
        log_limit: finalLimit,
        filters
      };
      
      const res = await api.post('/api/policy-simulator/run', payload);
      setResults(res.data);
      setSimRun(true);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to run policy simulation.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!results) return;
    try {
      const response = await api.post('/api/policy-simulator/export', {
        results,
        format
      }, { responseType: 'blob' });
      
      const blob = new Blob([response.data], {
        type: format === 'json' ? 'application/json' : (format === 'csv' ? 'text/csv' : 'application/pdf')
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `policy_simulation_report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export simulation report.');
    }
  };

  // Checkbox handlers
  const toggleCustomerPerm = (item) => {
    setSimCustomerPerms(prev =>
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  const toggleManagerPerm = (item) => {
    setSimManagerPerms(prev =>
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  const toggleAllowRule = (item) => {
    setSimAllowRules(prev =>
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  const toggleDenyRule = (item) => {
    setSimDenyRules(prev =>
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  const resetToLive = () => {
    setSimCustomerPerms(liveSettings.customer_permissions);
    setSimManagerPerms(liveSettings.manager_permissions);
    setSimAllowRules(liveSettings.allow_rules);
    setSimDenyRules(liveSettings.deny_rules);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] text-slate-100 overflow-hidden">
      {/* Simulation Warning Banner */}
      <div className="bg-red-950/80 border-b border-red-800/60 px-6 py-2.5 flex items-center justify-between text-xs font-semibold tracking-wider text-red-400">
        <div className="flex items-center gap-2">
          <ShieldAlert size={14} className="animate-pulse" />
          <span>SIMULATION MODE — NO CHANGES WILL BE APPLIED TO THE LIVE APPLICATION STATE</span>
        </div>
        <div className="text-[10px] bg-red-900/60 px-2 py-0.5 rounded border border-red-700/50 uppercase">
          What-If Isolation Active
        </div>
      </div>

      {/* breadcrumb path flow indicator */}
      <div className="bg-slate-900/40 border-b border-slate-800/60 px-6 py-3 flex items-center gap-6 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-1.5 text-slate-400">
          <div className="h-5 w-5 rounded bg-slate-800 flex items-center justify-center font-bold text-[10px]">1</div>
          <span>Current Live Policy</span>
        </div>
        <ChevronRight size={14} />
        <div className="flex items-center gap-1.5 text-slate-400">
          <div className="h-5 w-5 rounded bg-slate-800 flex items-center justify-center font-bold text-[10px]">2</div>
          <span>Simulated Policy Setup</span>
        </div>
        <ChevronRight size={14} />
        <div className="flex items-center gap-1.5 text-slate-400">
          <div className="h-5 w-5 rounded bg-slate-800 flex items-center justify-center font-bold text-[10px]">3</div>
          <span>Historical Audit Replay</span>
        </div>
        <ChevronRight size={14} />
        <div className="flex items-center gap-1.5 text-slate-400">
          <div className="h-5 w-5 rounded bg-red-900/60 flex items-center justify-center font-bold text-[10px] text-red-400">4</div>
          <span>Impact Analysis Report</span>
        </div>
      </div>

      {/* Main 3 Panel Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* PANEL 1: LEFT PANEL - POLICY CONFIGURATION */}
        <div className="w-80 flex-shrink-0 border-r border-slate-800/60 overflow-y-auto bg-slate-950/40 p-4 space-y-6 flex flex-col" style={{ width: '21rem' }}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Policy Configuration</span>
            <button onClick={resetToLive} className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 border border-red-900/50 px-2 py-0.5 rounded bg-red-950/20 hover:bg-red-950/40">
              <RefreshCw size={8} /> Reset to Live
            </button>
          </div>

          {/* Customer Role Permissions */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-blue-400 tracking-wider flex items-center gap-1">
              <span>CUSTOMER ROLE PERMISSIONS</span>
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 border border-slate-800/40 p-2 rounded-lg bg-slate-900/10">
              {CUSTOMER_OPTIONS.map(item => {
                const liveChecked = liveSettings.customer_permissions.includes(item);
                const simChecked = simCustomerPerms.includes(item);
                return (
                  <div key={item} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900/30">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-slate-300">
                      <input type="checkbox" checked={simChecked} onChange={() => toggleCustomerPerm(item)} className="rounded border-slate-700 text-blue-600 focus:ring-blue-900 bg-slate-950" />
                      <span>{item}</span>
                    </label>
                    <span className={`text-[10px] px-1 py-0.5 rounded font-mono ${liveChecked ? 'text-emerald-400 bg-emerald-950/30' : 'text-slate-500 bg-slate-900/30'}`}>
                      {liveChecked ? 'LIVE' : '✗'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Manager Role Permissions */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-orange-400 tracking-wider flex items-center gap-1">
              <span>MANAGER ROLE PERMISSIONS</span>
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 border border-slate-800/40 p-2 rounded-lg bg-slate-900/10">
              {MANAGER_OPTIONS.map(item => {
                const liveChecked = liveSettings.manager_permissions.includes(item);
                const simChecked = simManagerPerms.includes(item);
                return (
                  <div key={item} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900/30">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-slate-300">
                      <input type="checkbox" checked={simChecked} onChange={() => toggleManagerPerm(item)} className="rounded border-slate-700 text-orange-600 focus:ring-orange-900 bg-slate-950" />
                      <span>{item}</span>
                    </label>
                    <span className={`text-[10px] px-1 py-0.5 rounded font-mono ${liveChecked ? 'text-emerald-400 bg-emerald-950/30' : 'text-slate-500 bg-slate-900/30'}`}>
                      {liveChecked ? 'LIVE' : '✗'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Allow List Rules */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-emerald-400 tracking-wider flex items-center gap-1">
              <span>ALLOW LIST POLICIES</span>
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 border border-slate-800/40 p-2 rounded-lg bg-slate-900/10">
              {ALLOW_RULES.map(item => {
                const liveChecked = liveSettings.allow_rules.includes(item);
                const simChecked = simAllowRules.includes(item);
                return (
                  <div key={item} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900/30">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-slate-300">
                      <input type="checkbox" checked={simChecked} onChange={() => toggleAllowRule(item)} className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-900 bg-slate-950" />
                      <span>{item}</span>
                    </label>
                    <span className={`text-[10px] px-1 py-0.5 rounded font-mono ${liveChecked ? 'text-emerald-400 bg-emerald-950/30' : 'text-slate-500 bg-slate-900/30'}`}>
                      {liveChecked ? 'LIVE' : '✗'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deny List Rules */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-red-400 tracking-wider flex items-center gap-1">
              <span>DENY LIST POLICIES</span>
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 border border-slate-800/40 p-2 rounded-lg bg-slate-900/10">
              {DENY_RULES.map(item => {
                const liveChecked = liveSettings.deny_rules.includes(item);
                const simChecked = simDenyRules.includes(item);
                return (
                  <div key={item} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-900/30">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-slate-300">
                      <input type="checkbox" checked={simChecked} onChange={() => toggleDenyRule(item)} className="rounded border-slate-700 text-red-600 focus:ring-red-900 bg-slate-950" />
                      <span>{item}</span>
                    </label>
                    <span className={`text-[10px] px-1 py-0.5 rounded font-mono ${liveChecked ? 'text-emerald-400 bg-emerald-950/30' : 'text-slate-500 bg-slate-900/30'}`}>
                      {liveChecked ? 'LIVE' : '✗'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PANEL 2: CENTER PANEL - SIMULATION CONTROLS */}
        <div className="w-72 flex-shrink-0 border-r border-slate-800/60 overflow-y-auto bg-slate-950/20 p-4 space-y-6 flex flex-col" style={{ width: '18rem' }}>
          <div className="pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Simulation Settings</span>
          </div>

          {/* Historical Log limit */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Logs to Replay</label>
            <div className="grid grid-cols-2 gap-2">
              {[10, 20, 50, 100, 500].map(val => (
                <button key={val} onClick={() => setLogLimit(val)} className={`py-1.5 rounded text-[11px] font-semibold border ${logLimit === val ? 'bg-blue-600/30 border-blue-500 text-blue-300' : 'bg-slate-900/60 border-slate-800 text-slate-400'}`}>
                  Last {val}
                </button>
              ))}
              <button onClick={() => setLogLimit(-1)} className={`py-1.5 rounded text-[11px] font-semibold border ${logLimit === -1 ? 'bg-blue-600/30 border-blue-500 text-blue-300' : 'bg-slate-900/60 border-slate-800 text-slate-400'}`}>
                Custom
              </button>
            </div>
            {logLimit === -1 && (
              <input type="number" value={customLimit} onChange={e => setCustomLimit(e.target.value)} placeholder="Enter logs count..." className="w-full mt-2 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500" />
            )}
          </div>

          {/* Advanced filters */}
          <div className="space-y-4">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Replay Filters</label>
            
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">User Role</span>
              <select value={filters.user_role} onChange={e => setFilters({...filters, user_role: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">Region</span>
              <select value={filters.region} onChange={e => setFilters({...filters, region: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300">
                {REGIONS.map(reg => <option key={reg} value={reg}>{reg}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">Attack Category</span>
              <select value={filters.attack_category} onChange={e => setFilters({...filters, attack_category: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1.5 border-t border-slate-800/40 pt-3">
              <span className="text-[10px] text-slate-500 uppercase">Decision Focus</span>
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={filters.allowed_requests} onChange={e => setFilters({...filters, allowed_requests: e.target.checked})} className="rounded bg-slate-950 border-slate-800 text-blue-500" />
                  <span>Allowed</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={filters.blocked_requests} onChange={e => setFilters({...filters, blocked_requests: e.target.checked})} className="rounded bg-slate-950 border-slate-800 text-blue-500" />
                  <span>Blocked</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex-1" />

          {/* Action controller */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            {error && (
              <div className="text-[11px] text-red-400 bg-red-950/20 border border-red-900/30 rounded p-2 flex items-start gap-1.5">
                <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            <button onClick={handleSimRun} disabled={loading} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50 disabled:opacity-50 transition-all duration-150">
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>RUNNING ANALYSIS...</span>
                </>
              ) : (
                <>
                  <Play size={14} fill="white" />
                  <span>▶ RUN POLICY SIMULATION</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* PANEL 3: RIGHT PANEL - SIMULATION RESULTS */}
        <div className="flex-1 overflow-y-auto bg-slate-950/60 p-6 flex flex-col space-y-6">
          
          {!simRun ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500 text-center max-w-md mx-auto">
              <ArrowLeftRight size={56} className="opacity-15 text-blue-400 animate-pulse" />
              <h2 className="text-base font-bold text-slate-300">Policy Simulator Workspace</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Configure simulated roles, rules, and allowed boundaries in the left panel, choose audit logs counts, and execute the run simulation.
              </p>
              <div className="text-[10px] border border-slate-800 rounded-lg p-3 bg-slate-900/10 text-slate-500 text-left w-full mt-4 space-y-1 leading-normal">
                <p>● Completely isolated in-memory replayer</p>
                <p>● Zero database write operations executed</p>
                <p>● Generate detailed transition and impact analytics</p>
              </div>
            </div>
          ) : (
            <>
              {/* Top report status & exports */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>Simulation Analysis Report</span>
                    <span className="text-[10px] bg-blue-950 text-blue-400 px-2 py-0.5 rounded-full font-bold border border-blue-800/50 uppercase">
                      Analysis Complete
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500">Evaluating policy modifications against {results.summary.total_replayed} historical requests</p>
                </div>
                
                {/* Export Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Export Report:</span>
                  {['PDF', 'CSV', 'JSON'].map(fmt => (
                    <button key={fmt} onClick={() => handleExport(fmt)} className="px-3 py-1.5 rounded bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 text-[10px] font-bold tracking-wider flex items-center gap-1 transition-all">
                      <Download size={10} /> {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Live Policy</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-slate-200">{results.summary.old_allowed}</span>
                    <span className="text-xs text-slate-500">Allowed</span>
                    <span className="text-xl font-bold text-slate-200">/</span>
                    <span className="text-xl font-bold text-slate-400">{results.summary.old_blocked}</span>
                    <span className="text-xs text-slate-500">Blocked</span>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Simulated Policy</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-blue-400">{results.summary.new_allowed}</span>
                    <span className="text-xs text-slate-500">Allowed</span>
                    <span className="text-xl font-bold text-blue-400">/</span>
                    <span className="text-xl font-bold text-indigo-400">{results.summary.new_blocked}</span>
                    <span className="text-xs text-slate-500">Blocked</span>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Transition Impact</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-red-400">
                      {results.summary.changed_count}
                    </span>
                    <span className="text-xs text-slate-500">Changed ({results.summary.percentage_affected}%)</span>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Net Blocks Shift</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-bold ${results.summary.new_blocked - results.summary.old_blocked >= 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                      {results.summary.new_blocked - results.summary.old_blocked >= 0 ? '+' : ''}
                      {results.summary.new_blocked - results.summary.old_blocked}
                    </span>
                    <span className="text-xs text-slate-500">Blocked Diff</span>
                  </div>
                </div>
              </div>

              {/* Decision Transitions Grid */}
              <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-4 space-y-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Decision Transition Analysis</span>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg space-y-1">
                    <span className="text-[10px] text-slate-500">Allowed → Allowed</span>
                    <p className="text-lg font-bold text-emerald-400">{results.summary.transitions.allow_to_allow}</p>
                    <span className="text-[9px] text-slate-600 block">Access Maintained</span>
                  </div>
                  <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg space-y-1 border-l-2 border-l-red-500">
                    <span className="text-[10px] text-slate-500">Allowed → Blocked</span>
                    <p className="text-lg font-bold text-red-400">{results.summary.transitions.allow_to_block}</p>
                    <span className="text-[9px] text-red-500/75 block">New Access Blocks</span>
                  </div>
                  <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg space-y-1 border-l-2 border-l-emerald-500">
                    <span className="text-[10px] text-slate-500">Blocked → Allowed</span>
                    <p className="text-lg font-bold text-blue-400">{results.summary.transitions.block_to_allow}</p>
                    <span className="text-[9px] text-blue-400/75 block">New Access Opens</span>
                  </div>
                  <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg space-y-1">
                    <span className="text-[10px] text-slate-500">Blocked → Blocked</span>
                    <p className="text-lg font-bold text-slate-400">{results.summary.transitions.block_to_block}</p>
                    <span className="text-[9px] text-slate-650 block">Still Blocked</span>
                  </div>
                </div>
              </div>

              {/* Policy Impact Reports & Top Rule Changes */}
              <div className="grid grid-cols-2 gap-6">
                
                {/* Top Impacting Rules */}
                <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-4 flex flex-col space-y-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Top Policy Impact Analysis</span>
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-56 pr-1">
                    {results.top_impacts.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4 text-center">No rules caused decision changes.</p>
                    ) : (
                      results.top_impacts.map((item, idx) => (
                        <div key={item.rule_name} className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-900">
                          <span className="text-xs font-semibold text-slate-300">{item.rule_name}</span>
                          <span className="text-xs font-bold text-red-400 bg-red-950/30 border border-red-900/50 px-2 py-0.5 rounded">
                            {item.changes_count} requests affected
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* SVG Visual Charts */}
                <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-4 flex flex-col space-y-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Visual Decision Analysis</span>
                  
                  {/* SVG Bar Chart layout */}
                  <div className="flex-1 flex flex-col justify-center space-y-4 py-2">
                    {/* Live vs Simulated */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase">
                        <span>Live Policy</span>
                        <span>{results.summary.old_allowed} Allowed / {results.summary.old_blocked} Blocked</span>
                      </div>
                      <div className="w-full h-3.5 bg-slate-900 rounded overflow-hidden flex">
                        <div style={{ width: `${(results.summary.old_allowed / (results.summary.total_replayed || 1)) * 100}%` }} className="bg-emerald-600" />
                        <div style={{ width: `${(results.summary.old_blocked / (results.summary.total_replayed || 1)) * 100}%` }} className="bg-red-600" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase">
                        <span>Simulated Policy</span>
                        <span>{results.summary.new_allowed} Allowed / {results.summary.new_blocked} Blocked</span>
                      </div>
                      <div className="w-full h-3.5 bg-slate-900 rounded overflow-hidden flex">
                        <div style={{ width: `${(results.summary.new_allowed / (results.summary.total_replayed || 1)) * 100}%` }} className="bg-blue-600" />
                        <div style={{ width: `${(results.summary.new_blocked / (results.summary.total_replayed || 1)) * 100}%` }} className="bg-indigo-600" />
                      </div>
                    </div>

                    {/* Affected vs unaffected */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase">
                        <span>Simulation Transition Ratio</span>
                        <span>{results.summary.changed_count} Changed ({results.summary.percentage_affected}%)</span>
                      </div>
                      <div className="w-full h-3.5 bg-slate-900 rounded overflow-hidden flex">
                        <div style={{ width: `${(results.summary.changed_count / (results.summary.total_replayed || 1)) * 100}%` }} className="bg-red-500" />
                        <div style={{ width: `${(results.summary.unchanged_count / (results.summary.total_replayed || 1)) * 100}%` }} className="bg-slate-700" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab control for comparison list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Request Replay Details</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setActiveTab('all')} className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${activeTab === 'all' ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:text-slate-200'}`}>
                        All Replayed
                      </button>
                      <button onClick={() => setActiveTab('changed')} className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${activeTab === 'changed' ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:text-slate-200'}`}>
                        Changed Only ({results.summary.changed_count})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Replay Details Table */}
                <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900/60 border-b border-slate-850 text-slate-400 uppercase text-[9px] font-bold tracking-wider">
                        <th className="px-4 py-3">Request ID</th>
                        <th className="px-4 py-3">User ID</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Tool</th>
                        <th className="px-4 py-3">Operation</th>

                        <th className="px-4 py-3 text-center">Live Decision</th>
                        <th className="px-4 py-3 text-center">Simulated Decision</th>
                        <th className="px-4 py-3 text-center">Changed?</th>
                        <th className="px-4 py-3">Simulation Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 bg-slate-950/20">
                      {results.replayed_requests
                        .filter(r => activeTab === 'all' || r.changed)
                        .map(r => (
                          <tr key={r.request_id} className={`hover:bg-slate-900/20 transition-all ${r.changed ? 'bg-red-950/10' : ''}`}>
                            <td className="px-4 py-3.5 font-mono font-semibold text-slate-300">{r.request_id}</td>
                            <td className="px-4 py-3.5 font-mono text-slate-400">{r.user_id || '—'}</td>
                            <td className="px-4 py-3.5 font-semibold text-slate-400">{r.user_role}</td>
                            <td className="px-4 py-3.5 text-slate-300">{r.tool_name || '—'}</td>
                            <td className="px-4 py-3.5 text-slate-300 font-mono text-[10px] uppercase">{r.operation || '—'}</td>

                            
                            {/* Live Decision */}
                            <td className="px-4 py-3.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${r.old_decision === 'ALLOW' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/60' : 'bg-red-950/60 text-red-400 border-red-700/60'}`}>
                                {r.old_decision}
                              </span>
                            </td>

                            {/* Simulated Decision */}
                            <td className="px-4 py-3.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${r.new_decision === 'ALLOW' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/60' : 'bg-red-950/60 text-red-400 border-red-700/60'}`}>
                                {r.new_decision}
                              </span>
                            </td>

                            {/* Changed indicator */}
                            <td className="px-4 py-3.5 text-center">
                              {r.changed ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-orange-400 font-bold bg-orange-950/40 border border-orange-850 px-1.5 py-0.5 rounded">
                                  <ArrowLeftRight size={10} /> Changed
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500">Unchanged</span>
                              )}
                            </td>

                            {/* Reason details */}
                             <td className="px-4 py-3.5 text-slate-450 leading-normal min-w-[300px] whitespace-normal">
                               {r.reason}
                             </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
}
