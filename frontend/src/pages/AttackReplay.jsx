import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert, Play, Search, Filter, RefreshCw,
  AlertTriangle, XCircle, CheckCircle2, SkipForward, ArrowLeft,
  Clock, User, MapPin, Globe, Lock, Eye, FileText,
  Activity, Database, Shield, Terminal, Brain, Key, AlertCircle,
  Send, Ban, ExternalLink, ChevronRight
} from 'lucide-react';
import api from '../api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const THREAT_COLORS = {
  Critical: 'bg-red-950/70 text-red-400 border-red-700/60',
  High:     'bg-orange-950/70 text-orange-400 border-orange-700/60',
  Medium:   'bg-yellow-950/70 text-yellow-400 border-yellow-700/60',
  Warning:  'bg-yellow-950/70 text-yellow-400 border-yellow-700/60',
  Low:      'bg-blue-950/70 text-blue-400 border-blue-700/60',
};

function Badge({ label, cls = '' }) {
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border tracking-wider uppercase ${cls}`}>
      {label}
    </span>
  );
}

function ThreatBadge({ level }) {
  return <Badge label={level} cls={THREAT_COLORS[level] || 'bg-slate-800 text-slate-400 border-slate-600'} />;
}

function DecisionBadge({ d }) {
  const cls = d === 'Blocked' || d === 'Denied'
    ? 'bg-red-950/70 text-red-400 border-red-700/60'
    : d === 'Allowed'
      ? 'bg-emerald-950/70 text-emerald-400 border-emerald-700/60'
      : 'bg-slate-800 text-slate-400 border-slate-600';
  return <Badge label={d} cls={cls} />;
}

const NODE_STATUS_META = {
  PASS: { color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-700/60', glow: 'shadow-[0_0_12px_rgba(52,211,153,0.25)]' },
  FAIL: { color: 'text-red-400',     bg: 'bg-red-950/60 border-red-700/60',         glow: 'shadow-[0_0_16px_rgba(239,68,68,0.4)]' },
  SKIP: { color: 'text-slate-600',   bg: 'bg-slate-900/40 border-slate-800/60',     glow: '' },
};

const NODE_ICONS = {
  user_prompt: User, llm_processing: Brain, generated_tool_call: Terminal,
  tool_validation: CheckCircle2, permission_manifest: Key, abac_evaluation: Shield,
  region_validation: Globe, ownership_validation: Lock, pii_protection: Eye,
  threat_detection: AlertTriangle, security_decision: ShieldAlert,
  audit_log_written: Database, final_ai_response: Send,
};

const ROLES     = ['All','Customer','Manager','Admin','HR','Finance','Support'];
const REGIONS   = ['All','Bangalore','Mumbai','Chennai','Delhi','Hyderabad'];
const CATEGORIES= ['All','Cross Region Access','Ownership Violation','Privilege Escalation',
  'PII Access Attempt','Prompt Injection','Threat Threshold Violation',
  'Permission Violation','ABAC Policy Violation','Security Policy Violation'];
const THREAT_LEVELS = ['All','Critical','High','Medium','Warning','Low'];
const DECISIONS = ['All','Blocked','Denied'];

// ─── Attack List ─────────────────────────────────────────────────────────────

function AttackList({ onReplay }) {
  const [attacks, setAttacks]   = useState([]);
  const [total,   setTotal]     = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page,    setPage]      = useState(0);
  const pageSize = 20;

  const [filters, setFilters] = useState({
    userId:'', requestId:'', region:'All', userRole:'All',
    attackCategory:'All', threatLevel:'All', decision:'All',
    startDate:'', endDate:'',
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchAttacks = async () => {
    setLoading(true);
    try {
      const p = { skip: page * pageSize, limit: pageSize };
      if (filters.userId)                        p.user_id        = filters.userId;
      if (filters.requestId)                     p.request_id     = filters.requestId;
      if (filters.region !== 'All')              p.region         = filters.region;
      if (filters.userRole !== 'All')            p.user_role      = filters.userRole;
      if (filters.attackCategory !== 'All')      p.attack_category= filters.attackCategory;
      if (filters.threatLevel !== 'All')         p.threat_level   = filters.threatLevel;
      if (filters.decision !== 'All')            p.decision       = filters.decision;
      if (filters.startDate)                     p.start_date     = filters.startDate;
      if (filters.endDate)                       p.end_date       = filters.endDate;

      const res = await api.get('/api/attack-replay', { params: p });
      setAttacks(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setAttacks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAttacks(); }, [page, filters]);

  const set = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(0); };

  const SelectFilter = ({ label, k, opts }) => (
    <div>
      <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      <select className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red-600"
        value={filters[k]} onChange={e => set(k, e.target.value)}>
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-800/60 bg-slate-950 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-950/60 border border-red-700/60 flex items-center justify-center shadow-[0_0_16px_rgba(239,68,68,0.2)]">
              <ShieldAlert size={20} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">Attack Replay Center</h1>
              <p className="text-xs text-slate-500">Forensic investigation of all blocked / denied gateway attacks</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg font-mono">
              {total} attacks detected
            </span>
            <button onClick={fetchAttacks} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
              <RefreshCw size={14} />
            </button>
            <button onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all
                ${showFilters ? 'bg-red-950/40 border-red-700/60 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
              <Filter size={13} /> Filters
            </button>
          </div>
        </div>

        {/* Search row */}
        <div className="flex gap-3">
          {[
            { placeholder: 'Search by User ID…', k: 'userId' },
            { placeholder: 'Search by Request ID (REQ000001)…', k: 'requestId' },
          ].map(({ placeholder, k }) => (
            <div key={k} className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-600 transition-colors"
                placeholder={placeholder}
                value={filters[k]}
                onChange={e => set(k, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <SelectFilter label="Region"          k="region"          opts={REGIONS} />
            <SelectFilter label="User Role"       k="userRole"        opts={ROLES} />
            <SelectFilter label="Attack Category" k="attackCategory"  opts={CATEGORIES} />
            <SelectFilter label="Threat Level"    k="threatLevel"     opts={THREAT_LEVELS} />
            <SelectFilter label="Decision"        k="decision"        opts={DECISIONS} />
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
              <input type="datetime-local" className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red-600"
                value={filters.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">End Date</label>
              <input type="datetime-local" className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-red-600"
                value={filters.endDate} onChange={e => set('endDate', e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-sm">Scanning attack database…</p>
            </div>
          </div>
        ) : attacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
            <ShieldAlert size={40} className="opacity-20" />
            <p className="text-sm">No attacks found with current filters</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 z-10">
              <tr>
                {['Attack ID','Timestamp','User ID','Role','Region','Attack Category','Tool','Operation','Threat Level','Decision','Replay'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-slate-500 font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attacks.map((atk, i) => (
                <tr key={atk.log_id}
                  className={`border-b border-slate-800/40 hover:bg-red-950/10 transition-colors group ${i % 2 === 0 ? 'bg-slate-950' : 'bg-slate-900/30'}`}>
                  <td className="px-4 py-3 font-mono text-red-400 font-semibold">{atk.request_id}</td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{atk.timestamp ? new Date(atk.timestamp).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">{atk.user_id || '—'}</td>
                  <td className="px-4 py-3"><Badge label={atk.user_role} cls="bg-violet-950/70 text-violet-400 border-violet-700/60" /></td>
                  <td className="px-4 py-3 text-slate-400">{atk.region}</td>
                  <td className="px-4 py-3 text-slate-300 max-w-[160px] truncate" title={atk.attack_category}>{atk.attack_category}</td>
                  <td className="px-4 py-3 font-mono text-slate-400 text-[10px]">{atk.tool_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 uppercase text-[10px]">{atk.operation || '—'}</td>
                  <td className="px-4 py-3"><ThreatBadge level={atk.threat_level} /></td>
                  <td className="px-4 py-3"><DecisionBadge d={atk.decision} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => onReplay(atk.log_id, atk)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/60 hover:bg-red-900/60 border border-red-700/60 hover:border-red-500 text-red-400 hover:text-red-300 rounded-lg font-semibold transition-all duration-200 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)] group-hover:scale-105">
                      <Play size={11} className="fill-current" /> Replay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950 text-xs text-slate-500 flex-shrink-0">
          <span>{page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors">← Prev</button>
            <button disabled={(page + 1) * pageSize >= total} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Node Card ────────────────────────────────────────────────────────────────

function NodeCard({ node, index, isSelected, onClick, isVisible }) {
  const meta = NODE_STATUS_META[node.status] || NODE_STATUS_META.SKIP;
  const Icon = NODE_ICONS[node.id] || ShieldAlert;

  return (
    <div className={`transition-all duration-500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ transitionDelay: `${index * 100}ms` }}>
      <button onClick={onClick}
        className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200
          ${isSelected ? `${meta.bg} ${meta.glow} scale-[1.02]` : 'bg-slate-900/50 border-slate-700/40 hover:bg-slate-800/60 hover:border-slate-600'}
          ${node.status === 'SKIP' ? 'opacity-40' : ''}`}>
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0
            ${node.status === 'PASS' ? 'bg-emerald-950/60 border border-emerald-700/40' :
              node.status === 'FAIL' ? 'bg-red-950/60 border border-red-700/40' :
              'bg-slate-800/60 border border-slate-700/40'}`}>
            <Icon size={14} className={meta.color} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold truncate ${isSelected ? meta.color : 'text-slate-300'}`}>{node.name}</p>
            <p className="text-[10px] text-slate-500">{node.execution_time_ms > 0 ? `${node.execution_time_ms}ms` : 'Skipped'}</p>
          </div>
          <span className={`text-[10px] font-black ${meta.color}`}>{node.status}</span>
        </div>
      </button>
    </div>
  );
}

// ─── Replay View ─────────────────────────────────────────────────────────────

function ReplayView({ logId, onBack }) {
  const [trace, setTrace]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [selectedNode, setSelected] = useState(null);
  const [visibleCount, setVisible]  = useState(0);
  const [playing, setPlaying]       = useState(false);
  const [showTimeline, setShowTL]   = useState(false);
  const [actionMsg, setActionMsg]   = useState('');
  const interval = useRef(null);

  const getLocalTime = (offsetMs) => {
    if (!trace?.timestamp) return '';
    const date = new Date(new Date(trace.timestamp).getTime() + (offsetMs || 0));
    const pad = (num, size = 2) => String(num).padStart(size, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/api/attack-replay/${logId}`);
        setTrace(res.data);
        setPlaying(true);
      } catch (e) {
        setError(e?.response?.data?.detail || 'Failed to load attack replay data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [logId]);

  // Staggered node animation
  useEffect(() => {
    if (!trace || !playing) return;
    setVisible(0);
    setSelected(null);
    let cnt = 0;
    interval.current = setInterval(() => {
      cnt++;
      setVisible(cnt);
      if (cnt >= trace.nodes.length) {
        clearInterval(interval.current);
        setPlaying(false);
        const failIdx = trace.nodes.findIndex(n => n.status === 'FAIL');
        if (failIdx >= 0) setSelected(trace.nodes[failIdx]);
      }
    }, 180);
    return () => clearInterval(interval.current);
  }, [trace, playing]);

  const replay = () => { setVisible(0); setSelected(null); setPlaying(true); };

  const doAction = async (type) => {
    if (!trace?.alert_id) return setActionMsg('No security alert linked to this attack.');
    try {
      if (type === 'warn')    { await api.post(`/api/alerts/${trace.alert_id}/warn`);    setActionMsg('✅ Warning sent. Audit entry created.'); }
      if (type === 'disable') { await api.post(`/api/alerts/${trace.alert_id}/disable`); setActionMsg('🔒 Account disabled. Audit entry created.'); }
    } catch (e) { setActionMsg(e?.response?.data?.detail || 'Action failed.'); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 border-2 border-red-900 rounded-full animate-ping opacity-50" />
        <div className="w-14 h-14 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-slate-400 text-sm">Loading forensic replay…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-red-400">
      <XCircle size={40} />
      <p className="text-sm">{error}</p>
      <button onClick={onBack} className="mt-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm hover:bg-slate-700 transition-colors">← Back to list</button>
    </div>
  );

  const sel = selectedNode;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 border-b border-slate-800/60 bg-slate-950">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-400 hover:text-white text-xs font-medium transition-all hover:bg-slate-700">
              <ArrowLeft size={13} /> All Attacks
            </button>
            <div>
              <div className="flex items-center gap-3 mb-0.5">
                <span className="font-mono text-red-400 font-bold text-sm">{trace.request_id}</span>
                <ThreatBadge level={trace.threat_level} />
                <DecisionBadge d={trace.decision} />
              </div>
              <p className="text-xs text-slate-500">{trace.attack_category} · {trace.user_id} · {trace.region}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowTL(t => !t)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all
                ${showTimeline ? 'bg-violet-950/40 border-violet-700/60 text-violet-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
              <Activity size={12} className="inline mr-1.5" /> Timeline
            </button>
            <button onClick={replay}
              className="flex items-center gap-2 px-4 py-2 bg-red-950/60 hover:bg-red-900/60 border border-red-700/60 rounded-lg text-red-400 text-xs font-semibold transition-all hover:shadow-[0_0_12px_rgba(239,68,68,0.35)]">
              <RefreshCw size={13} /> Replay Attack
            </button>
          </div>
        </div>

        {/* Summary tiles */}
        <div className="px-6 pb-4 grid grid-cols-5 gap-3">
          {[
            { label: 'Attacker',   val: trace.username || trace.user_id, Icon: User },
            { label: 'Role',       val: trace.user_role, Icon: Shield },
            { label: 'Region',     val: trace.region,    Icon: MapPin },
            { label: 'Failed At',  val: trace.failed_stage, Icon: XCircle },
            { label: 'Total Time', val: `${trace.total_execution_ms}ms`, Icon: Clock },
          ].map(({ label, val, Icon }) => (
            <div key={label} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={11} className="text-slate-500" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
              </div>
              <p className="text-xs font-semibold text-slate-200 truncate">{val || '—'}</p>
            </div>
          ))}
        </div>

        {/* Timeline strip */}
        {showTimeline && trace.timeline?.length > 0 && (
          <div className="px-6 pb-4">
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 overflow-x-auto">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-3">Attack Timeline</p>
              <div className="flex items-start gap-0 min-w-max">
                {trace.timeline.map((evt, i) => (
                  <div key={i} className="flex items-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-[10px] font-mono ${evt.status === 'FAIL' ? 'text-red-400 font-bold' : 'text-slate-400'}`}>{getLocalTime(evt.offset_ms)}</span>
                      <div className={`h-2 w-2 rounded-full ${evt.status === 'FAIL' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]' : 'bg-emerald-500'}`} />
                      <span className={`text-[10px] text-center max-w-[70px] leading-tight ${evt.status === 'FAIL' ? 'text-red-400 font-semibold' : 'text-slate-500'}`}>{evt.event}</span>
                    </div>
                    {i < trace.timeline.length - 1 && <div className="h-px w-8 bg-slate-700 mt-2 mx-1 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Pipeline column */}
        <div className="w-68 flex-shrink-0 border-r border-slate-800/60 overflow-y-auto p-4 bg-slate-950/50" style={{ width: '17rem' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Execution Pipeline</p>
            {playing && <span className="text-[10px] text-red-400 animate-pulse font-bold">● REPLAYING</span>}
          </div>
          <div className="flex flex-col gap-2">
            {trace.nodes.map((node, i) => (
              <React.Fragment key={node.id}>
                <NodeCard node={node} index={i} isSelected={sel?.id === node.id}
                  onClick={() => setSelected(node)} isVisible={i < visibleCount} />
                {i < trace.nodes.length - 1 && (
                  <div className={`flex justify-center transition-all duration-300 ${i + 1 < visibleCount ? 'opacity-100' : 'opacity-0'}`}>
                    <div className={`w-px h-3 ${node.status === 'FAIL' ? 'bg-red-700' : node.status === 'SKIP' ? 'bg-slate-800' : 'bg-slate-600'}`} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto bg-slate-950">
          {!sel ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
              <ShieldAlert size={52} className="opacity-15" />
              <p className="text-sm font-medium">Click any pipeline node to inspect forensic details</p>
              <p className="text-xs text-slate-700">Nodes animate one-by-one to reconstruct the attack flow</p>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              {/* Node title */}
              <div className="flex items-center gap-4">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border ${NODE_STATUS_META[sel.status]?.bg || ''}`}>
                  {React.createElement(NODE_ICONS[sel.id] || ShieldAlert, { size: 24, className: NODE_STATUS_META[sel.status]?.color || 'text-slate-400' })}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-base font-bold text-slate-100">{sel.name}</h2>
                    <Badge label={sel.status} cls={
                      sel.status === 'PASS' ? 'bg-emerald-950/70 text-emerald-400 border-emerald-700/60' :
                      sel.status === 'FAIL' ? 'bg-red-950/70 text-red-400 border-red-700/60' :
                      'bg-slate-800 text-slate-500 border-slate-700'} />
                    <Badge label={`${sel.execution_time_ms}ms`} cls="bg-slate-800 text-slate-400 border-slate-700" />
                    <span className="text-xs font-mono text-slate-500">{getLocalTime(sel.offset_ms)}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{sel.description}</p>
                </div>
              </div>

              {/* Input / Output */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                    <ChevronRight size={12} /> Input Data
                  </p>
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all leading-relaxed max-h-40 overflow-y-auto">{sel.input_data || '—'}</pre>
                </div>
                <div className={`bg-slate-900/60 border rounded-xl p-4 ${sel.status === 'FAIL' ? 'border-red-700/50' : 'border-slate-700/50'}`}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                    <ChevronRight size={12} /> Output Data
                    {sel.status === 'FAIL' && <span className="text-red-400 ml-2">⛔ BLOCKED HERE</span>}
                  </p>
                  <pre className={`text-xs font-mono whitespace-pre-wrap break-all leading-relaxed max-h-40 overflow-y-auto ${sel.status === 'FAIL' ? 'text-red-300' : 'text-slate-300'}`}>{sel.output_data || '—'}</pre>
                </div>
              </div>

              {/* Decision row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase mb-2">Decision</p>
                  <DecisionBadge d={sel.decision} />
                </div>
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase mb-2">Validation Result</p>
                  <Badge label={sel.validation_result} cls={
                    sel.validation_result === 'PASS' ? 'bg-emerald-950/70 text-emerald-400 border-emerald-700/60' :
                    sel.validation_result === 'FAIL' ? 'bg-red-950/70 text-red-400 border-red-700/60' :
                    'bg-slate-800 text-slate-500 border-slate-700'} />
                </div>
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase mb-2">Exec Time</p>
                  <span className="text-xs font-mono text-slate-300">{sel.execution_time_ms}ms</span>
                </div>
              </div>

              {/* Forensic details */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-3">Forensic Details</p>
                <div className="space-y-0">
                  {Object.entries(sel.details || {}).map(([k, v]) => {
                    if (v === null || v === undefined || v === '') return null;
                    const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    return (
                      <div key={k} className="flex gap-3 py-2 border-b border-slate-800/40 last:border-0">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider w-32 flex-shrink-0 pt-0.5 font-semibold">{label}</span>
                        {typeof v === 'boolean' ? (
                          <Badge label={v ? 'Yes' : 'No'} cls={v ? 'bg-emerald-950/70 text-emerald-400 border-emerald-700/60' : 'bg-slate-800 text-slate-400 border-slate-600'} />
                        ) : Array.isArray(v) ? (
                          <div className="flex flex-wrap gap-1">
                            {v.length > 0 ? v.map(item => <Badge key={item} label={item} cls="bg-orange-950/70 text-orange-400 border-orange-700/60" />) : <span className="text-slate-600 text-xs">None</span>}
                          </div>
                        ) : (
                          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all flex-1 leading-relaxed">
                            {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Admin actions — always visible at security_decision / threat_detection */}
              {(sel.id === 'security_decision' || sel.id === 'threat_detection' || sel.id === 'final_ai_response') && (
                <div className="bg-red-950/15 border border-red-700/40 rounded-xl p-4">
                  <p className="text-[10px] text-red-400 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
                    <ShieldAlert size={11} /> Admin Incident Desk
                  </p>
                  {actionMsg && (
                    <div className="mb-3 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300">{actionMsg}</div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => doAction('warn')}
                      className="flex items-center gap-2 px-3 py-2 bg-yellow-950/60 hover:bg-yellow-900/60 border border-yellow-700/60 text-yellow-400 rounded-lg text-xs font-semibold transition-all hover:shadow-[0_0_8px_rgba(234,179,8,0.3)]">
                      <AlertTriangle size={12} /> Send Warning
                    </button>
                    <button onClick={() => doAction('disable')}
                      className="flex items-center gap-2 px-3 py-2 bg-red-950/60 hover:bg-red-900/60 border border-red-700/60 text-red-400 rounded-lg text-xs font-semibold transition-all hover:shadow-[0_0_8px_rgba(239,68,68,0.3)]">
                      <Ban size={12} /> Disable Account
                    </button>
                    <a href="/roles?tab=audits"
                      className="flex items-center gap-2 px-3 py-2 bg-violet-950/60 hover:bg-violet-900/60 border border-violet-700/60 text-violet-400 rounded-lg text-xs font-semibold transition-all hover:shadow-[0_0_8px_rgba(139,92,246,0.3)]">
                      <ExternalLink size={12} /> View Audit Log
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const AttackReplay = () => {
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const role = user?.role_name || '';

  const [replayId, setReplayId] = useState(null);

  if (role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500 bg-slate-950">
        <Lock size={48} className="opacity-20" />
        <p className="text-base font-semibold text-slate-400">Admin Access Only</p>
        <p className="text-xs">The Attack Replay Center is restricted to administrators.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950">
      {replayId
        ? <ReplayView logId={replayId} onBack={() => setReplayId(null)} />
        : <AttackList onReplay={(id) => setReplayId(id)} />
      }
    </div>
  );
};

export default AttackReplay;
