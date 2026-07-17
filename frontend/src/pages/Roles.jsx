import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ShieldCheck, ShieldAlert, Search, AlertOctagon, X, Clock, Mail, Ban, ChevronRight, Eye, Play, Filter, Calendar, CheckCircle2, XCircle, ArrowRight, ShieldAlert as ShieldX, Database, AlertCircle, ChevronDown, UserCheck, Server, Key, FileText, Activity } from 'lucide-react';
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

  // Audits tab state
  const [audits, setAudits] = useState([]);
  const [totalAudits, setTotalAudits] = useState(0);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditRoleFilter, setAuditRoleFilter] = useState('All');
  const [auditRegionFilter, setAuditRegionFilter] = useState('All');
  const [auditDecisionFilter, setAuditDecisionFilter] = useState('All');
  const [auditAttackFilter, setAuditAttackFilter] = useState('All');
  const [auditToolFilter, setAuditToolFilter] = useState('All');
  const [auditOperationFilter, setAuditOperationFilter] = useState('All');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');

  // Detailed Audit state
  const [selectedAuditId, setSelectedAuditId] = useState(null);
  const [auditDetails, setAuditDetails] = useState(null);
  const [auditDetailsLoading, setAuditDetailsLoading] = useState(false);

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

  const fetchAudits = async () => {
    setAuditsLoading(true);
    try {
      const skip = (auditPage - 1) * limit;
      const res = await api.get('/api/audit-logs', {
        params: {
          skip,
          limit,
          request_id: auditSearch?.toUpperCase().startsWith('REQ') ? auditSearch : undefined,
          session_id: auditSearch?.length > 15 ? auditSearch : undefined,
          user_id: (!auditSearch?.toUpperCase().startsWith('REQ') && auditSearch?.length <= 15) ? auditSearch || undefined : undefined,
          customer_id: auditSearch || undefined,
          order_id: auditSearch || undefined,
          user_role: auditRoleFilter !== 'All' ? auditRoleFilter : undefined,
          region: auditRegionFilter !== 'All' ? auditRegionFilter : undefined,
          decision: auditDecisionFilter !== 'All' ? auditDecisionFilter : undefined,
          attack_category: auditAttackFilter !== 'All' ? auditAttackFilter : undefined,
          tool_name: auditToolFilter !== 'All' ? auditToolFilter : undefined,
          operation: auditOperationFilter !== 'All' ? auditOperationFilter : undefined,
          start_date: auditStartDate || undefined,
          end_date: auditEndDate || undefined
        }
      });
      setAudits(res.data.items || []);
      setTotalAudits(res.data.total || 0);
    } catch (err) {
      console.error('Error fetching audits', err);
    } finally {
      setAuditsLoading(false);
    }
  };

  const fetchAuditDetails = async (logId) => {
    setAuditDetailsLoading(true);
    setSelectedAuditId(logId);
    setAuditDetails(null);
    try {
      const res = await api.get(`/api/audit-logs/${logId}/details`);
      setAuditDetails(res.data);
    } catch (err) {
      console.error('Error fetching audit details', err);
      alert('Failed to load audit details.');
      setSelectedAuditId(null);
    } finally {
      setAuditDetailsLoading(false);
    }
  };

  const handleWarnActionAudit = async (alertId, logId) => {
    setActionLoading(true);
    try {
      await api.post(`/api/alerts/${alertId}/warn`);
      alert('Warning email sent successfully and user account unlocked.');
      fetchAuditDetails(logId);
      fetchAudits();
    } catch (err) {
      console.error(err);
      alert('Failed to send warning email.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableActionAudit = async (alertId, logId) => {
    setActionLoading(true);
    try {
      await api.post(`/api/alerts/${alertId}/disable`);
      alert('User account permanently disabled successfully.');
      fetchAuditDetails(logId);
      fetchAudits();
    } catch (err) {
      console.error(err);
      alert('Failed to disable account.');
    } finally {
      setActionLoading(false);
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

  useEffect(() => {
    if (activeTab === 'audits') {
      fetchAudits();
    }
  }, [activeTab, auditPage, auditRoleFilter, auditRegionFilter, auditDecisionFilter, auditAttackFilter, auditToolFilter, auditOperationFilter, auditStartDate, auditEndDate]);

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
        <button
          onClick={() => setActiveTab('audits')}
          className={`text-xs font-black uppercase tracking-wider pb-3 transition-all ${
            activeTab === 'audits'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Enterprise Audit Logs
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

      {/* ===================== ENTERPRISE AUDIT LOGS TAB ===================== */}
      {activeTab === 'audits' && (
        <>
          {/* Search & Filter bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Global search */}
              <div className="relative flex-1 min-w-[200px]">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAudits()}
                  placeholder="Search by User ID / Customer ID / Order ID / Request ID / Session ID..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs pl-8 pr-3 py-2 rounded-xl placeholder-slate-600 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <button
                onClick={() => { setAuditPage(1); fetchAudits(); }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all"
              >
                Search
              </button>
              <button
                onClick={() => {
                  setAuditSearch(''); setAuditRoleFilter('All'); setAuditRegionFilter('All');
                  setAuditDecisionFilter('All'); setAuditAttackFilter('All');
                  setAuditToolFilter('All'); setAuditOperationFilter('All');
                  setAuditStartDate(''); setAuditEndDate(''); setAuditPage(1);
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold rounded-xl transition-all"
              >
                Reset
              </button>
            </div>

            {/* Secondary Filters Row */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Role filter */}
              <select
                value={auditRoleFilter}
                onChange={(e) => { setAuditRoleFilter(e.target.value); setAuditPage(1); }}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600"
              >
                <option value="All">All Roles</option>
                <option value="Customer">Customer</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>

              {/* Region filter */}
              <select
                value={auditRegionFilter}
                onChange={(e) => { setAuditRegionFilter(e.target.value); setAuditPage(1); }}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600"
              >
                <option value="All">All Regions</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi</option>
                <option value="Chennai">Chennai</option>
                <option value="Hyderabad">Hyderabad</option>
              </select>

              {/* Decision filter */}
              <select
                value={auditDecisionFilter}
                onChange={(e) => { setAuditDecisionFilter(e.target.value); setAuditPage(1); }}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600"
              >
                <option value="All">All Decisions</option>
                <option value="Allowed">Allowed</option>
                <option value="Blocked">Blocked</option>
                <option value="Denied">Denied</option>
              </select>

              {/* Operation filter */}
              <select
                value={auditOperationFilter}
                onChange={(e) => { setAuditOperationFilter(e.target.value); setAuditPage(1); }}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600"
              >
                <option value="All">All Operations</option>
                <option value="create">Create</option>
                <option value="read">Read</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </select>

              {/* Date range */}
              <input
                type="date"
                value={auditStartDate}
                onChange={(e) => { setAuditStartDate(e.target.value); setAuditPage(1); }}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600"
                title="Start Date"
              />
              <span className="text-slate-600 text-xs">→</span>
              <input
                type="date"
                value={auditEndDate}
                onChange={(e) => { setAuditEndDate(e.target.value); setAuditPage(1); }}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600"
                title="End Date"
              />

              <div className="ml-auto text-[10px] text-slate-500 font-mono">
                {totalAudits} records found
              </div>
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Request ID</th>
                    <th className="p-3">User ID</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Region</th>
                    <th className="p-3">Tool</th>
                    <th className="p-3">Operation</th>
                    <th className="p-3">Decision</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {auditsLoading ? (
                    <tr>
                      <td colSpan="10" className="p-8 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-indigo-500 mx-auto"></div>
                      </td>
                    </tr>
                  ) : audits.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="p-10 text-center text-slate-500 font-medium">
                        No audit log entries found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    audits.map((log) => {
                      const decisionColor = log.decision === 'Blocked'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : log.decision === 'Allowed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                      const sevColor = log.severity === 'High' || log.severity === 'Critical'
                        ? 'text-red-400'
                        : log.severity === 'Medium'
                          ? 'text-amber-400'
                          : 'text-slate-500';
                      return (
                        <tr
                          key={log.log_id}
                          className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                          onClick={() => fetchAuditDetails(log.log_id)}
                        >
                          <td className="p-3 font-mono text-slate-500 text-[10px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-3 font-mono text-indigo-400 text-[10px]">
                            REQ{String(log.log_id).padStart(6, '0')}
                          </td>
                          <td className="p-3 font-bold text-slate-200">{log.user_id}</td>
                          <td className="p-3 text-slate-400">{log.user_role || '—'}</td>
                          <td className="p-3 text-slate-400">{log.region || '—'}</td>
                          <td className="p-3 font-mono text-sky-400 text-[10px]">{log.tool_name}</td>
                          <td className="p-3 text-slate-300 uppercase text-[10px]">{log.operation}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${decisionColor}`}>
                              {log.decision}
                            </span>
                          </td>
                          <td className={`p-3 font-semibold text-[10px] ${sevColor}`}>{log.severity || 'Low'}</td>
                          <td className="p-3 text-right">
                            <button
                              className="p-1.5 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20 transition-all"
                              onClick={(e) => { e.stopPropagation(); fetchAuditDetails(log.log_id); }}
                            >
                              <Eye size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalAudits > limit && (
              <div className="flex items-center justify-between p-4 border-t border-slate-800 text-slate-400 text-xs">
                <span>Page {auditPage} of {Math.ceil(totalAudits / limit)}</span>
                <div className="flex gap-2">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage(auditPage - 1)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={auditPage >= Math.ceil(totalAudits / limit)}
                    onClick={() => setAuditPage(auditPage + 1)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ======================== AUDIT DETAIL DRAWER ======================== */}
          {selectedAuditId && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm" onClick={() => { setSelectedAuditId(null); setAuditDetails(null); }}>
              <div
                className="w-full max-w-3xl bg-slate-950 border-l border-slate-800 h-full overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drawer Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10">
                  <div>
                    <h2 className="text-sm font-bold text-slate-100">Audit Log Inspection</h2>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {auditDetails ? `REQ${String(auditDetails.request_info?.log_id).padStart(6, '0')} · ${auditDetails.request_info?.timestamp ? new Date(auditDetails.request_info.timestamp).toLocaleString() : ''}` : 'Loading...'}
                    </p>
                  </div>
                  <button
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400"
                    onClick={() => { setSelectedAuditId(null); setAuditDetails(null); }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {auditDetailsLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
                  </div>
                ) : auditDetails ? (
                  <div className="p-5 space-y-5">

                    {/* === SECTION 1: Request Info === */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={12} className="text-indigo-400" /> Section 1 — Request Information
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {[
                          ['Request ID', `REQ${String(auditDetails.request_info?.log_id).padStart(6, '0')}`],
                          ['Session ID', auditDetails.request_info?.session_id || '—'],
                          ['User ID', auditDetails.request_info?.user_id],
                          ['Username', auditDetails.request_info?.username],
                          ['Role', auditDetails.request_info?.role],
                          ['Region', auditDetails.request_info?.region],
                          ['Source', auditDetails.request_info?.source],
                          ['Client IP', auditDetails.request_info?.client_ip],
                        ].map(([label, val]) => (
                          <div key={label} className="bg-slate-950/70 border border-slate-800/50 rounded-xl p-2.5">
                            <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">{label}</div>
                            <div className="font-semibold text-slate-200 font-mono text-[11px] truncate">{val || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* === SECTION 2: User Prompt & Tool === */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={12} className="text-violet-400" /> Section 2 — User Request
                      </h3>
                      {auditDetails.user_request?.original_prompt && (
                        <div>
                          <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1.5">Original Prompt</div>
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300 text-xs italic leading-relaxed">
                            "{auditDetails.user_request.original_prompt}"
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-950/70 border border-slate-800/50 rounded-xl p-2.5">
                          <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">Tool Called</div>
                          <div className="font-mono text-sky-400 text-[11px]">{auditDetails.user_request?.tool_name || '—'}</div>
                        </div>
                        <div className="bg-slate-950/70 border border-slate-800/50 rounded-xl p-2.5">
                          <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">Operation</div>
                          <div className="font-mono text-slate-200 text-[11px] uppercase">{auditDetails.user_request?.operation || '—'}</div>
                        </div>
                      </div>
                      {auditDetails.user_request?.generated_tool && (
                        <div>
                          <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1.5">Generated Tool JSON</div>
                          <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] text-slate-400 overflow-x-auto font-mono whitespace-pre-wrap break-all">
                            {(() => { try { return JSON.stringify(JSON.parse(auditDetails.user_request.generated_tool), null, 2); } catch { return auditDetails.user_request.generated_tool; } })()}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* === SECTION 3: Pipeline Flow === */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Server size={12} className="text-cyan-400" /> Section 3 — Security Gateway Pipeline
                      </h3>
                      <div className="space-y-2">
                        {(auditDetails.pipeline || []).map((node, idx) => {
                          const isFail = node.status === 'FAIL';
                          const isSkip = node.status === 'SKIP';
                          const isPass = node.status === 'PASS';
                          const isRedacted = node.decision === 'Redacted';
                          const nodeBg = isFail
                            ? 'bg-red-950/40 border-red-600/40'
                            : isSkip
                              ? 'bg-slate-950/60 border-slate-700/40 opacity-50'
                              : isRedacted
                                ? 'bg-violet-950/40 border-violet-600/40'
                                : 'bg-emerald-950/30 border-emerald-700/30';
                          const dotColor = isFail ? 'bg-red-500' : isSkip ? 'bg-slate-600' : isRedacted ? 'bg-violet-500' : 'bg-emerald-500';
                          const statusText = isFail ? 'FAIL' : isSkip ? 'SKIP' : isRedacted ? 'REDACT' : 'PASS';
                          const statusColor = isFail ? 'text-red-400' : isSkip ? 'text-slate-500' : isRedacted ? 'text-violet-400' : 'text-emerald-400';
                          return (
                            <div key={idx} className={`flex items-start gap-3 border rounded-xl p-3 transition-all ${nodeBg}`}>
                              <div className="flex flex-col items-center gap-1 pt-0.5">
                                <div className={`h-2.5 w-2.5 rounded-full ${dotColor} ${isPass || isRedacted ? 'shadow-[0_0_6px_currentColor]' : ''}`}></div>
                                {idx < (auditDetails.pipeline.length - 1) && (
                                  <div className="w-px h-4 bg-slate-700"></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-slate-200">{node.name}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[9px] text-slate-600 font-mono">{node.execution_time}</span>
                                    <span className={`text-[9px] font-black ${statusColor}`}>{statusText}</span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{node.explanation}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* === SECTION 4: Security Decision === */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Key size={12} className="text-amber-400" /> Section 4 — Security Decision
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-black ${auditDetails.security_decision?.final_decision === 'Blocked' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                          {auditDetails.security_decision?.final_decision}
                        </span>
                        <div>
                          <div className="text-[9px] text-slate-500 uppercase tracking-widest">Triggered Rule</div>
                          <div className="text-xs font-semibold text-amber-300">{auditDetails.security_decision?.triggered_rule || 'None'}</div>
                        </div>
                      </div>
                      {auditDetails.security_decision?.reason && (
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 leading-relaxed">
                          {auditDetails.security_decision.reason}
                        </div>
                      )}
                    </div>

                    {/* === SECTION 5: Resource Info === */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Database size={12} className="text-sky-400" /> Section 5 — Resource Context
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {[
                          ['Customer ID', auditDetails.resource_info?.customer_id],
                          ['Order ID', auditDetails.resource_info?.order_id],
                          ['Employee ID', auditDetails.resource_info?.employee_id],
                          ['Region', auditDetails.resource_info?.region],
                          ['Resource Type', auditDetails.resource_info?.resource_type],
                        ].map(([label, val]) => val ? (
                          <div key={label} className="bg-slate-950/70 border border-slate-800/50 rounded-xl p-2.5">
                            <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">{label}</div>
                            <div className="font-semibold text-slate-200 font-mono text-[11px]">{val}</div>
                          </div>
                        ) : null)}
                      </div>
                    </div>

                    {/* === SECTION 6: Execution Metrics === */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={12} className="text-green-400" /> Section 6 — Execution Metrics
                      </h3>
                      <div className="grid grid-cols-4 gap-3 text-center">
                        {[
                          ['Gateway', auditDetails.metrics?.gateway_time, 'text-indigo-400'],
                          ['ABAC Engine', auditDetails.metrics?.abac_time, 'text-violet-400'],
                          ['Database', auditDetails.metrics?.db_time, 'text-sky-400'],
                          ['Total', auditDetails.metrics?.total_time, 'text-emerald-400'],
                        ].map(([label, val, color]) => (
                          <div key={label} className="bg-slate-950/80 border border-slate-800/50 rounded-xl p-3">
                            <div className={`text-lg font-black ${color}`}>{val || '—'}</div>
                            <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-1">{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* === SECTION 7: Threat Info (conditional) === */}
                    {auditDetails.threat_info && (
                      <div className="bg-rose-950/30 border border-rose-700/30 rounded-2xl p-4 space-y-3">
                        <h3 className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                          <AlertCircle size={12} /> Section 7 — Threat Detection
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-950/60 border border-rose-800/30 rounded-xl p-3">
                            <div className="text-[9px] text-slate-500 uppercase mb-1">Threat Level</div>
                            <div className="text-sm font-black text-rose-400">{auditDetails.threat_info.threat_level}</div>
                          </div>
                          <div className="bg-slate-950/60 border border-rose-800/30 rounded-xl p-3">
                            <div className="text-[9px] text-slate-500 uppercase mb-1">Attack Category</div>
                            <div className="text-xs font-semibold text-orange-300">{auditDetails.threat_info.attack_category}</div>
                          </div>
                          <div className="bg-slate-950/60 border border-rose-800/30 rounded-xl p-3">
                            <div className="text-[9px] text-slate-500 uppercase mb-1">Violation Counter</div>
                            <div className="text-xs text-slate-200 font-mono">
                              {auditDetails.threat_info.counter_before} → <span className="text-red-400 font-black">{auditDetails.threat_info.counter_after}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* === SECTION 8: PII Redaction Shield === */}
                    {auditDetails.pii_redaction?.enabled && (
                      <div className="bg-violet-950/30 border border-violet-700/30 rounded-2xl p-4 space-y-3">
                        <h3 className="text-[10px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-2">
                          <Shield size={12} /> Section 8 — PII Output Shield
                        </h3>
                        <p className="text-xs text-slate-400">The following sensitive fields were automatically redacted from the response before it left the gateway boundary:</p>
                        <div className="flex flex-wrap gap-2">
                          {(auditDetails.pii_redaction.masked_fields || []).map((f) => (
                            <span key={f} className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold">
                              🔒 {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* === SECTION 9: Approval Workflow === */}
                    {auditDetails.approval_workflow && (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <UserCheck size={12} className="text-teal-400" /> Section 9 — Approval Workflow
                        </h3>
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-black border ${auditDetails.approval_workflow.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : auditDetails.approval_workflow.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                            {auditDetails.approval_workflow.status}
                          </span>
                          {auditDetails.approval_workflow.approved_by && (
                            <span className="text-xs text-slate-400">Approved by: <span className="text-slate-200 font-semibold">{auditDetails.approval_workflow.approved_by}</span></span>
                          )}
                          {auditDetails.approval_workflow.approved_timestamp && (
                            <span className="text-[10px] font-mono text-slate-500">{new Date(auditDetails.approval_workflow.approved_timestamp).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* === SECTION 10: Database Changes === */}
                    {auditDetails.database_changes && (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Database size={12} className="text-teal-400" /> Section 10 — Database Changes
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                            <div className="text-[9px] text-slate-500 uppercase mb-1">Table</div>
                            <div className="text-slate-200 font-mono">{auditDetails.database_changes.table_name}</div>
                          </div>
                          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                            <div className="text-[9px] text-slate-500 uppercase mb-1">Operation</div>
                            <div className="text-amber-300 font-black uppercase">{auditDetails.database_changes.operation}</div>
                          </div>
                        </div>
                        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                          <div className="text-[9px] text-slate-500 uppercase mb-1">Result</div>
                          <div className="text-emerald-400 text-xs">{auditDetails.database_changes.after_values}</div>
                        </div>
                      </div>
                    )}

                    {/* === SECTION 11: Final Response === */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-emerald-400" /> Section 11 — Final Response
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-lg text-sm font-black ${auditDetails.final_response?.http_status === 200 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          HTTP {auditDetails.final_response?.http_status}
                        </span>
                        <span className="text-xs text-slate-400">{auditDetails.final_response?.backend_response}</span>
                      </div>
                      {auditDetails.final_response?.ai_response && (
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 italic leading-relaxed">
                          {auditDetails.final_response.ai_response}
                        </div>
                      )}
                    </div>

                    {/* === SECTION 12: Admin Incident Desk === */}
                    {auditDetails.threat_info && (
                      <div className="bg-slate-900 border border-rose-800/30 rounded-2xl p-4 space-y-3">
                        <h3 className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                          <ShieldAlert size={12} /> Section 12 — Admin Incident Desk
                        </h3>
                        <p className="text-[10px] text-slate-500">Actions triggered from here will create their own audit log entry.</p>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => handleWarnActionAudit(auditDetails.threat_info?.alert_id, selectedAuditId)}
                            disabled={actionLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-xl hover:bg-amber-600/20 transition-all disabled:opacity-40"
                          >
                            <Mail size={12} /> Send Warning & Unlock
                          </button>
                          <button
                            onClick={() => handleDisableActionAudit(auditDetails.threat_info?.alert_id, selectedAuditId)}
                            disabled={actionLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl hover:bg-red-600/20 transition-all disabled:opacity-40"
                          >
                            <Ban size={12} /> Permanently Disable Account
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Roles;
