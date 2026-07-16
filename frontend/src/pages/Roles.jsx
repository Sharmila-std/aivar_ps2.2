import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ShieldCheck, ShieldAlert, Search, AlertOctagon, X, Clock, Mail, Ban, ChevronRight, Eye, Play } from 'lucide-react';
import api from '../api';

const Roles = () => {
  const [activeTab, setActiveTab] = useState('manifest'); // 'manifest' or 'alerts'
  
  // Manifest tab state
  const [manifests, setManifests] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [page, setPage] = useState(1);
  const limit = 8;

  // Alerts tab state
  const [alerts, setAlerts] = useState([]);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertPage, setAlertPage] = useState(1);
  const [alertStatusFilter, setAlertStatusFilter] = useState('All');
  const [pendingAlertsCount, setPendingAlertsCount] = useState(0);

  // Modal / Detail state
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [alertDetails, setAlertDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchManifest = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * limit;
      const res = await api.get('/api/permission-manifest', {
        params: {
          role: roleFilter !== 'All' ? roleFilter : undefined,
          tool_name: search || undefined,
          skip,
          limit
        }
      });
      setManifests(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Error fetching manifest', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    setAlertsLoading(true);
    try {
      const skip = (alertPage - 1) * limit;
      const res = await api.get('/api/alerts', {
        params: {
          status: alertStatusFilter !== 'All' ? alertStatusFilter : undefined,
          skip,
          limit
        }
      });
      setAlerts(res.data.items);
      setTotalAlerts(res.data.total);
      
      // Update pending badge count
      const countRes = await api.get('/api/alerts', {
        params: { status: 'Pending Investigation', limit: 1 }
      });
      setPendingAlertsCount(countRes.data.total);
    } catch (err) {
      console.error('Error fetching alerts', err);
    } finally {
      setAlertsLoading(false);
    }
  };

  useEffect(() => {
    fetchManifest();
  }, [search, roleFilter, page]);

  useEffect(() => {
    if (activeTab === 'alerts') {
      fetchAlerts();
    }
  }, [activeTab, alertPage, alertStatusFilter]);

  // Load badge count on mount
  useEffect(() => {
    const getBadgeCount = async () => {
      try {
        const countRes = await api.get('/api/alerts', {
          params: { status: 'Pending Investigation', limit: 1 }
        });
        setPendingAlertsCount(countRes.data.total);
      } catch (err) {
        console.error(err);
      }
    };
    getBadgeCount();
  }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleRoleFilter = (role) => {
    setRoleFilter(role);
    setPage(1);
  };

  const fetchAlertDetails = async (alertId) => {
    setDetailsLoading(true);
    setSelectedAlertId(alertId);
    setAlertDetails(null);
    try {
      const res = await api.get(`/api/alerts/${alertId}/details`);
      setAlertDetails(res.data);
    } catch (err) {
      console.error('Error fetching alert details', err);
      alert('Failed to load alert details.');
      setSelectedAlertId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleWarnAction = async (alertId) => {
    setActionLoading(true);
    try {
      await api.post(`/api/alerts/${alertId}/warn`);
      alert('Warning email sent successfully and user account unlocked.');
      fetchAlertDetails(alertId);
      fetchAlerts();
    } catch (err) {
      console.error(err);
      alert('Failed to send warning email.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableAction = async (alertId) => {
    setActionLoading(true);
    try {
      await api.post(`/api/alerts/${alertId}/disable`);
      alert('User account permanently disabled successfully.');
      fetchAlertDetails(alertId);
      fetchAlerts();
    } catch (err) {
      console.error(err);
      alert('Failed to disable account.');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const totalAlertPages = Math.ceil(totalAlerts / limit);

  const getSeverityColor = (sev) => {
    if (sev?.toLowerCase() === 'critical') return 'bg-red-500/10 text-red-400 border border-red-500/20';
    if (sev?.toLowerCase() === 'high') return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
    return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      let cleanLine = line;
      let isHeader = false;
      let isBullet = false;

      if (line.trim().startsWith('### ')) {
        cleanLine = line.replace('### ', '');
        isHeader = true;
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        cleanLine = line.replace(/^[\s\-\*]+/, '');
        isBullet = true;
      }

      const parts = [];
      let currentIdx = 0;
      const regex = /\*\*(.*?)\*\*/g;
      let match;
      while ((match = regex.exec(cleanLine)) !== null) {
        if (match.index > currentIdx) {
          parts.push(cleanLine.substring(currentIdx, match.index));
        }
        parts.push(<strong key={match.index} className="text-slate-100 font-bold">{match[1]}</strong>);
        currentIdx = regex.lastIndex;
      }
      if (currentIdx < cleanLine.length) {
        parts.push(cleanLine.substring(currentIdx));
      }

      if (isHeader) {
        return (
          <h4 key={idx} className="text-slate-200 font-bold text-xs uppercase tracking-wider mt-4 mb-2 pb-1 border-b border-slate-800">
            {parts.length > 0 ? parts : cleanLine}
          </h4>
        );
      }
      if (isBullet) {
        return (
          <li key={idx} className="list-disc ml-5 mb-1.5 text-slate-300 text-xs leading-relaxed">
            {parts.length > 0 ? parts : cleanLine}
          </li>
        );
      }
      return (
        <p key={idx} className="mb-2 text-slate-400 text-xs leading-relaxed">
          {parts.length > 0 ? parts : cleanLine}
        </p>
      );
    });
  };

  return (
    <div className="flex-1 p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] bg-slate-950">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Security Control & incident Desk</h1>
        <p className="text-slate-400 text-xs mt-1">Configure role permissions, monitor gateway threat meter warnings, and investigate probed systems.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-800/80 pb-1">
        <button
          onClick={() => setActiveTab('manifest')}
          className={`text-xs font-black uppercase tracking-wider pb-3 transition-all ${
            activeTab === 'manifest'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Permission Manifests
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`text-xs font-black uppercase tracking-wider pb-3 transition-all flex items-center gap-2 ${
            activeTab === 'alerts'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Security Incident Center
          {pendingAlertsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-600 border border-rose-500 text-white text-[9px] font-black animate-pulse">
              {pendingAlertsCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'manifest' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="relative w-full max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search by tool name..."
                value={search}
                onChange={handleSearch}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-slate-200 placeholder-slate-500 text-xs focus:border-indigo-500 focus:outline-none transition-all"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {['All', 'Admin', 'Customer', 'Support', 'Manager', 'Finance'].map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleFilter(role)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    roleFilter === role
                      ? 'bg-indigo-600/10 border border-indigo-500/30 text-indigo-400'
                      : 'bg-slate-950 border border-slate-800/60 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Manifest table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="p-4">Manifest ID</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Tool Name</th>
                    <th className="p-4">Operation</th>
                    <th className="p-4">Resource</th>
                    <th className="p-4">Allowed</th>
                    <th className="p-4">Scope Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-500">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-indigo-500 mx-auto"></div>
                      </td>
                    </tr>
                  ) : manifests.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-500 font-medium">
                        No permission manifest entries found.
                      </td>
                    </tr>
                  ) : (
                    manifests.map((m) => (
                      <tr key={m.manifest_id} className="hover:bg-slate-800/20">
                        <td className="p-4 font-mono text-slate-500">{m.manifest_id}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 border border-slate-700/60 font-semibold text-slate-200">
                            {m.role}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-200">{m.tool_name}</td>
                        <td className="p-4 font-medium text-slate-400">{m.operation}</td>
                        <td className="p-4 text-slate-400">{m.resource}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            m.allowed 
                              ? 'bg-green-500/10 text-green-400' 
                              : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {m.allowed ? 'True' : 'False'}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-[10px] text-slate-400 bg-slate-950/20 max-w-[200px] truncate" title={m.scope_rule}>
                          {m.scope_rule}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'alerts' && (
        <>
          {/* Alerts Filter Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                🚨 {pendingAlertsCount} Pending Security Investigations
              </span>
            </div>
            
            <div className="flex gap-2">
              {['All', 'Pending Investigation', 'RESOLVED'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setAlertStatusFilter(status);
                    setAlertPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    alertStatusFilter === status
                      ? 'bg-indigo-600/10 border border-indigo-500/30 text-indigo-400'
                      : 'bg-slate-950 border border-slate-800/60 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  {status === 'Pending Investigation' ? 'Pending' : (status === 'RESOLVED' ? 'Resolved' : 'All')}
                </button>
              ))}
            </div>
          </div>

          {/* Alerts Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="p-4">Alert ID</th>
                    <th className="p-4">Severity</th>
                    <th className="p-4">User ID</th>
                    <th className="p-4">Threat Level</th>
                    <th className="p-4">Violations</th>
                    <th className="p-4">Reason / Rule</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {alertsLoading ? (
                    <tr>
                      <td colSpan="9" className="p-8 text-center text-slate-500">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-indigo-500 mx-auto"></div>
                      </td>
                    </tr>
                  ) : alerts.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="p-8 text-center text-slate-500 font-medium">
                        No security incidents filed.
                      </td>
                    </tr>
                  ) : (
                    alerts.map((a) => (
                      <tr key={a.alert_id} className="hover:bg-slate-800/20">
                        <td className="p-4 font-mono text-slate-500">{a.alert_id}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getSeverityColor(a.severity)}`}>
                            {a.severity}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-200">{a.user_id}</td>
                        <td className="p-4">
                          <span className="text-slate-300 font-medium">{a.threat_level || 'Critical'}</span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-400">
                          {a.violation_count || 3}
                        </td>
                        <td className="p-4 text-slate-400 font-mono text-[10px] max-w-[200px] truncate" title={a.reason}>
                          {a.reason}
                        </td>
                        <td className="p-4 text-slate-500 font-mono">
                          {new Date(a.created_at).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            a.status === 'RESOLVED' 
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
                          }`}>
                            {['Pending Investigation', 'PENDING', 'OPEN'].includes(a.status) ? 'Pending' : a.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => fetchAlertDetails(a.alert_id)}
                            className="px-2.5 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 rounded-xl border border-indigo-500/20 transition flex items-center gap-1.5 ml-auto text-[11px]"
                          >
                            <Eye size={12} />
                            Investigate
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* DETAILED INVESTIGATION MODAL */}
      {selectedAlertId && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-rose-600/10 border border-rose-500/20 rounded-xl flex items-center justify-center text-rose-400">
                  <AlertOctagon size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Security Incident Investigation Desk</h3>
                  <p className="text-[10px] text-slate-500">Analyze probed gateway actions and issue administrator decisions.</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlertId(null)}
                className="h-8 w-8 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 font-sans">
              {detailsLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500 mx-auto"></div>
                  <p className="text-xs text-slate-500 animate-pulse">Running LLM security logs compilation...</p>
                </div>
              ) : alertDetails ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Context Card & LLM Report */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* User & Session Context */}
                    <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-2xl space-y-4">
                      <h4 className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Account Context Metadata</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-mono text-xs">
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                          <span className="text-[9px] text-slate-500 block">User Name</span>
                          <span className="text-slate-200 font-bold">{alertDetails.user_name}</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                          <span className="text-[9px] text-slate-500 block">User ID / Role</span>
                          <span className="text-indigo-400 font-bold">{alertDetails.user_id} ({alertDetails.role})</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                          <span className="text-[9px] text-slate-500 block">Session Violations</span>
                          <span className="text-rose-400 font-bold">{alertDetails.violation_count} / 3</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl col-span-2">
                          <span className="text-[9px] text-slate-500 block">Active Session ID</span>
                          <span className="text-slate-400 text-[10px] truncate block">{alertDetails.session_id}</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                          <span className="text-[9px] text-slate-500 block">Threat Rating</span>
                          <span className="text-red-400 font-bold">{alertDetails.threat_level}</span>
                        </div>
                      </div>
                    </div>

                    {/* LLM Incident Investigation Summary */}
                    <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                        <ShieldAlert size={16} className="text-indigo-400" />
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">AI Copilot Incident Synopsis</h4>
                      </div>
                      <div className="prose prose-invert max-w-none text-slate-300">
                        {renderMarkdown(alertDetails.investigation_summary)}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Timeline & Administrative Action */}
                  <div className="space-y-6">
                    {/* Resolution Panel */}
                    <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-2xl space-y-4">
                      <h4 className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Administrative Actions</h4>
                      
                      <Link
                        to={`/incident-replay/${alertDetails.alert_id}`}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
                      >
                        <Play size={14} className="fill-white" />
                        Visual Incident Replay
                      </Link>
                      
                      {alertDetails.status !== 'RESOLVED' ? (
                        <div className="space-y-3">
                          <button
                            onClick={() => handleWarnAction(alertDetails.alert_id)}
                            disabled={actionLoading}
                            className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
                          >
                            <Mail size={14} />
                            {actionLoading ? 'Executing Decision...' : 'Option 1: Send Warning & Unlock'}
                          </button>
                          
                          <button
                            onClick={() => handleDisableAction(alertDetails.alert_id)}
                            disabled={actionLoading}
                            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
                          >
                            <Ban size={14} />
                            {actionLoading ? 'Executing Decision...' : 'Option 2: Permanent Lock Account'}
                          </button>
                          
                          <p className="text-[9px] text-slate-500 leading-normal mt-2 italic">
                            *Note: Warning issues will automatically notify sarmiladummy@gmail.com and approve logins. Permanent locks require manual admin recovery.
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-center space-y-2">
                          <span className="h-2 w-2 rounded-full bg-green-500 inline-block"></span>
                          <span className="text-xs font-bold text-green-400 block">Incident Resolved</span>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Resolution: <span className="text-white font-semibold">{alertDetails.resolution_notes}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Associated Audit Logs */}
                    <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-2xl space-y-4 flex flex-col max-h-[300px]">
                      <h4 className="text-[10px] text-slate-500 uppercase tracking-widest font-black shrink-0">Associated Audit Trail</h4>
                      <div className="overflow-y-auto space-y-3 pr-1 flex-1">
                        {!alertDetails.audit_logs || alertDetails.audit_logs.length === 0 ? (
                          <div className="text-[10px] text-slate-500 italic py-8 text-center">
                            No recent audit logs recorded for this user/session.
                          </div>
                        ) : (
                          alertDetails.audit_logs.map((l) => (
                            <div key={l.log_id} className="p-2.5 bg-slate-900 border border-slate-850 rounded-xl space-y-1 text-[10px]">
                              <div className="flex justify-between text-slate-500 font-mono">
                                <span>{new Date(l.timestamp).toLocaleTimeString()}</span>
                                <span className={l.decision === 'Blocked' ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
                                  {l.decision.toUpperCase()}
                                </span>
                              </div>
                              <div className="font-semibold text-slate-200">
                                {l.tool_name}.{l.operation}
                              </div>
                              <div className="text-slate-400 font-mono italic text-[9px] leading-normal mt-0.5">
                                Reason: {l.reason}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;
