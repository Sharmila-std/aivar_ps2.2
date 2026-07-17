import React, { useState, useEffect } from 'react';
import { Bot, Terminal, Shield, Play, Copy, Check, Info, Cpu, ArrowRight, User, ShieldAlert } from 'lucide-react';
import api from '../api';

const AIWorkspace = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  
  const [toolCall, setToolCall] = useState(null);
  const [toolCallStr, setToolCallStr] = useState('');
  const [validationStatus, setValidationStatus] = useState('Idle');
  
  const [executionResult, setExecutionResult] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [metrics, setMetrics] = useState(null);

  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [groqLatency, setGroqLatency] = useState(0);

  const [violationCount, setViolationCount] = useState(0);
  const [threatLevel, setThreatLevel] = useState('Safe');
  const [sessionTerminated, setSessionTerminated] = useState(false);

  useEffect(() => {
    const fetchSessionInfo = async () => {
      try {
        const res = await api.get('/api/auth/session/current');
        if (res.data) {
          setViolationCount(res.data.violation_count);
          setThreatLevel(res.data.threat_level);
          if (res.data.violation_count >= 3 || res.data.session_status === 'Terminated') {
            setSessionTerminated(true);
            setTimeout(() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }, 3000);
          }
        }
      } catch (err) {
        console.error('Error fetching session threat info', err);
      }
    };
    fetchSessionInfo();
  }, []);

  const userObj = JSON.parse(localStorage.getItem('user') || '{}');
  const roleName = userObj.role_name || '';

  // Suggested Prompts
  const suggestedPrompts = roleName === 'Customer' ? [
    "Show my profile details",
    "Request a new order for Gold Support Plan",
    "Submit profile update request to change address to 456 Lake Road",
    "List my purchase orders"
  ] : [
    "Show customer CUS000001",
    "Create customer John Smith",
    "Delete customer CUS000010",
    "List all orders",
    "Show employee EMP000001",
    "Show dashboard summary"
  ];

  // Active step in execution pipeline visualization
  const [pipelineStep, setPipelineStep] = useState('idle');

  const handleGenerate = async (selectedPrompt) => {
    const activePrompt = selectedPrompt || prompt;
    if (!activePrompt.trim()) return;

    if (!selectedPrompt) {
      setPrompt(activePrompt);
    } else {
      setPrompt(activePrompt);
    }

    setLoading(true);
    setPipelineStep('generating');
    setToolCall(null);
    setToolCallStr('');
    setExecutionResult(null);
    setExplanation(null);
    setMetrics(null);
    setValidationStatus('Compiling...');

    const t0 = performance.now();
    try {
      const res = await api.post('/api/ai/generate', { prompt: activePrompt });
      const elapsed = performance.now() - t0;
      setGroqLatency(elapsed);
      
      const tc = res.data.tool_call;
      setToolCall(tc);
      setToolCallStr(JSON.stringify(tc, null, 4));
      
      // Update history
      setHistory(prev => [activePrompt, ...prev.slice(0, 4)]);

      setPipelineStep('generated');
      
      // Auto Validate
      setTimeout(() => {
        setPipelineStep('validating');
        const isValid = res.data.is_valid;
        if (isValid) {
          setValidationStatus('Valid');
          setPipelineStep('resolved');
        } else {
          setValidationStatus('Invalid Format');
          setPipelineStep('idle');
        }
      }, 600);

    } catch (err) {
      alert('Failed to generate tool JSON from prompt.');
      setValidationStatus('Failed');
      setPipelineStep('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    let parsedCall = null;
    try {
      parsedCall = JSON.parse(toolCallStr);
    } catch (err) {
      alert('Invalid JSON in editor. Cannot execute.');
      return;
    }

    setExecuting(true);
    setPipelineStep('executing');
    setExecutionResult(null);
    setExplanation(null);
    setMetrics(null);

    try {
      const res = await api.post('/api/ai/execute', { tool_call: parsedCall, prompt: prompt });
      
      if (res.data.success) {
        setExecutionResult(res.data.data);
        setExplanation(res.data.explanation || null);
        const m = res.data.metrics;
        setMetrics(m);
        setPipelineStep('completed');
        
        if (m?.session) {
          setViolationCount(m.session.violation_count);
          setThreatLevel(m.session.threat_level);
          if (m.session.violation_count >= 3 || m.session.session_terminated) {
            setSessionTerminated(true);
            setTimeout(() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }, 3000);
          }
        }
      } else {
        // Structured block response from gateway
        setExecutionResult(res.data.error);
        setExplanation(res.data.explanation || null);
        const m = res.data.metrics;
        setMetrics(m);
        setPipelineStep('completed');
        
        if (m?.session) {
          setViolationCount(m.session.violation_count);
          setThreatLevel(m.session.threat_level);
          if (m.session.violation_count >= 3 || m.session.session_terminated) {
            setSessionTerminated(true);
            setTimeout(() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }, 3000);
          }
        }
      }
    } catch (err) {
      setExecutionResult({ error: err.response?.data?.detail || 'Execution failed' });
      setExplanation(`Execution failed: ${err.response?.data?.detail || err.message}`);
      setMetrics({
        status: 'Failed',
        execution_time_ms: 0,
        response_size_bytes: 0
      });
      setPipelineStep('completed');
    } finally {
      setExecuting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(toolCallStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJSONChange = (e) => {
    setToolCallStr(e.target.value);
    try {
      JSON.parse(e.target.value);
      setValidationStatus('Valid (Modified)');
    } catch (err) {
      setValidationStatus('Invalid JSON Syntax');
    }
  };



  const userStr = localStorage.getItem('user');
  const loggedInUser = userStr ? JSON.parse(userStr) : null;
  const isCustomer = loggedInUser?.role_name === 'Customer';

  const sessionInfo = metrics?.session || (loggedInUser ? {
    user_id: loggedInUser.employee_id,
    role: loggedInUser.role_name,
    region: loggedInUser.region || 'Global',
    department: loggedInUser.department || 'Support'
  } : null);

  const steps = [
    { name: 'Prompt Input', key: 'prompt', sub: 'Input Query' },
    { name: 'Groq Compiler', key: 'groq', sub: 'JSON Translate' },
    { name: 'JSON Validation', key: 'validation', sub: 'Format Check' },
    { name: 'Security Gateway', key: 'gateway', sub: 'Active Session' },
    { name: 'Permission Check', key: 'permission', sub: 'Manifest Match' },
    { name: 'ABAC Validator', key: 'abac', sub: 'Attribute Match' },
    { name: 'Scope Validation', key: 'scope', sub: 'Region/Owner' },
    { name: 'Decision Engine', key: 'decision', sub: 'ALLOW / DENY' },
    { name: 'CRM Executor', key: 'executor', sub: 'Write/Read DB' }
  ];

  const renderStepNode = (step, idx) => {
    let nodeStatus = 'pending';
    let latency = 0;
    
    if (metrics) {
      if (step.key === 'prompt') {
        nodeStatus = 'success';
        latency = 0;
      } else if (step.key === 'groq') {
        nodeStatus = 'success';
        latency = groqLatency;
      } else if (step.key === 'validation') {
        nodeStatus = validationStatus.startsWith('Valid') ? 'success' : 'blocked';
        latency = 1.2;
      } else if (step.key === 'decision') {
        nodeStatus = metrics.status === 'Blocked' ? 'blocked' : 'success';
      } else {
        const pipeData = metrics.pipeline?.[step.key];
        if (pipeData) {
          nodeStatus = pipeData.status === 'Success' ? 'success' : (pipeData.status === 'Blocked' ? 'blocked' : 'pending');
          latency = pipeData.latency_ms || 0;
        }
      }
    } else {
      if (pipelineStep === 'generating' && step.key === 'groq') {
        nodeStatus = 'active';
      } else if (pipelineStep === 'validating' && step.key === 'validation') {
        nodeStatus = 'active';
      } else if (pipelineStep === 'executing' && ['gateway', 'permission', 'abac', 'scope', 'decision', 'executor'].includes(step.key)) {
        nodeStatus = 'active';
      } else {
        if (['generated', 'resolved', 'completed'].includes(pipelineStep)) {
          if (step.key === 'prompt') nodeStatus = 'success';
          if (step.key === 'groq') nodeStatus = 'success';
          if (step.key === 'validation' && ['resolved', 'completed'].includes(pipelineStep)) nodeStatus = 'success';
        }
      }
    }

    let colorClass = 'bg-slate-950/60 border-slate-800/80 text-slate-500';
    if (nodeStatus === 'success') {
      colorClass = 'bg-emerald-950/40 border-emerald-500/40 text-white';
    } else if (nodeStatus === 'blocked') {
      colorClass = 'bg-rose-950/40 border-rose-500/40 text-white';
    } else if (nodeStatus === 'active') {
      colorClass = 'bg-indigo-900/30 border-indigo-500 text-white animate-pulse';
    }

    return (
      <div key={step.key} className={`p-3 rounded-2xl border transition-all duration-300 flex flex-col justify-between min-h-[85px] ${colorClass}`}>
        <div className="flex items-center justify-between gap-1">
          <span className="font-bold text-[10px] text-white block uppercase tracking-wider">{idx + 1}. {step.name}</span>
          {latency > 0 && (
            <span className="text-[8px] font-mono text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded-lg border border-slate-800">
              {latency.toFixed(1)}ms
            </span>
          )}
        </div>
        <span className="text-[8px] text-slate-400 font-medium mt-1 block">{step.sub}</span>
        {step.key === 'decision' && metrics && (
          <span className={`text-[9px] font-bold mt-1 block uppercase ${metrics.status === 'Blocked' ? 'text-rose-400' : 'text-emerald-400'}`}>
            {metrics.status === 'Blocked' ? 'DENY' : 'ALLOW'}
          </span>
        )}
      </div>
    );
  };

  const getGaugeColor = (count) => {
    if (count === 1) return '#eab308'; // Yellow
    if (count === 2) return '#f97316'; // Orange
    if (count >= 3) return '#ef4444'; // Red
    return '#10b981'; // Green
  };

  const getGaugeText = (count) => {
    if (count === 1) return 'Warning';
    if (count === 2) return 'High Risk';
    if (count >= 3) return 'Critical';
    return 'Safe';
  };

  const getGaugeOffset = (count) => {
    const percent = Math.min(count / 3, 1.0);
    return 141 - (percent * 141);
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] bg-slate-950">
      {sessionTerminated && (
        <div className="fixed inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-lg">
          <div className="bg-slate-900 border border-rose-500/40 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="h-16 w-16 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto text-rose-500 animate-bounce">
              <ShieldAlert size={36} className="animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-rose-500 tracking-tight">CRITICAL THREAT DETECTED</h2>
              <p className="text-slate-400 text-sm">
                Maximum threshold of 3 boundary security violations reached for this session.
              </p>
            </div>
            
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/60 text-left font-sans">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Gateway Actions Triggered:</p>
              <ul className="text-xs text-slate-500 list-disc list-inside mt-2 space-y-1">
                <li>Dynamic session terminated</li>
                <li>JWT credentials invalidated</li>
                <li>Account status set to Suspended</li>
                <li>Incidents report filed for Administrator</li>
              </ul>
            </div>
            
            <div className="text-slate-400 text-xs flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-rose-500"></div>
              Redirecting to login page...
            </div>
          </div>
        </div>
      )}

      {/* Header & Threat Meter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 border border-slate-800/80 p-6 rounded-3xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Bot size={26} className="text-indigo-400" />
            AI Copilot Workspace
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Demonstrate and inspect natural language translations to secure structured Tool Calls inside the CRM runtime context.
          </p>
        </div>

        {/* Threat Meter Gauge Widget */}
        <div className="flex items-center gap-6 bg-slate-950/40 border border-slate-800/60 px-6 py-3 rounded-2xl shrink-0">
          <div className="relative h-16 w-20 flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 120 70">
              <path
                d="M 15 60 A 45 45 0 0 1 105 60"
                fill="none"
                stroke="#1e293b"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 15 60 A 45 45 0 0 1 105 60"
                fill="none"
                stroke={getGaugeColor(violationCount)}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="141"
                strokeDashoffset={getGaugeOffset(violationCount)}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute bottom-1 text-center">
              <span className="text-lg font-black text-slate-100 leading-none">{violationCount}</span>
              <span className="text-slate-500 text-[9px] block">/ 3 max</span>
            </div>
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Session Security Status</span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: getGaugeColor(violationCount) }}></span>
              <span className="text-xs font-black uppercase tracking-widest text-[11px]" style={{ color: getGaugeColor(violationCount) }}>
                {getGaugeText(violationCount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* THREE PANEL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT PANEL */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex flex-col space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Terminal size={16} className="text-indigo-400" />
            <h3 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">Natural Prompt Input</h3>
          </div>
          
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">User Query / Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Show customer CUS000001"
              rows="4"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-all resize-none"
            />
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={loading || !prompt.trim()}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-100 rounded-xl font-semibold text-xs transition shadow-lg shadow-indigo-600/10"
          >
            {loading ? 'Converting via Groq...' : 'Generate Tool Call'}
          </button>

          <div className="space-y-2 pt-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Quick Templates</span>
            <div className="flex flex-wrap gap-1.5">
              {suggestedPrompts.map((pText, idx) => (
                <button
                  key={idx}
                  onClick={() => handleGenerate(pText)}
                  className="text-[10px] px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition"
                >
                  {pText}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2 flex-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Prompt History</span>
            <div className="divide-y divide-slate-800/40 max-h-36 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="text-[10px] text-slate-600 italic py-1">No queries run yet.</p>
              ) : (
                history.map((hist, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleGenerate(hist)}
                    className="w-full text-left text-[11px] text-slate-400 hover:text-indigo-400 truncate py-1.5 block transition"
                    title={hist}
                  >
                    • {hist}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CENTER PANEL */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-indigo-400" />
              <h3 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">Generated Tool call</h3>
            </div>
            
            {toolCall && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                validationStatus.startsWith('Valid') ? 'bg-green-500/10 text-green-400' :
                validationStatus.startsWith('Invalid') ? 'bg-rose-500/10 text-rose-400' :
                'bg-amber-500/10 text-amber-400'
              }`}>
                {validationStatus}
              </span>
            )}
          </div>

          <div className="flex-1 flex flex-col space-y-2 relative">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Structured JSON Payload</label>
            <textarea
              readOnly={!toolCall}
              value={toolCallStr}
              onChange={handleJSONChange}
              placeholder='{\n    "tool": "...",\n    "operation": "...",\n    "parameters": {}\n}'
              className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-indigo-300 placeholder-slate-700 focus:border-indigo-500 focus:outline-none transition resize-none min-h-[220px]"
            />
            {toolCall && (
              <button
                onClick={handleCopy}
                className="absolute right-3 top-7 p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
                title="Copy JSON Payload"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            )}
          </div>

          <button
            onClick={handleExecute}
            disabled={executing || !toolCall || validationStatus.startsWith('Invalid')}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-100 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/20"
          >
            <Play size={12} />
            {executing ? 'Executing Query...' : 'Execute Tool Call'}
          </button>
        </div>

        {/* RIGHT PANEL */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex flex-col space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Shield size={16} className="text-indigo-400" />
            <h3 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">Tool Response Console</h3>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl text-center">
              <span className="text-[9px] text-slate-500 block uppercase font-medium">Status</span>
              <span className={`text-[11px] font-bold ${
                metrics?.status === 'Success' ? 'text-green-400' : (metrics?.status === 'Blocked' ? 'text-rose-400' : 'text-slate-500')
              }`}>
                {metrics?.status || 'Idle'}
              </span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl text-center">
              <span className="text-[9px] text-slate-500 block uppercase font-medium">Time</span>
              <span className="text-[11px] font-bold text-slate-300 font-mono">
                {metrics ? `${metrics.execution_time_ms} ms` : '0.0 ms'}
              </span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl text-center">
              <span className="text-[9px] text-slate-500 block uppercase font-medium">Size</span>
              <span className="text-[11px] font-bold text-slate-300 font-mono">
                {metrics ? `${metrics.response_size_bytes} B` : '0 B'}
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col space-y-2">
            <label className="text-[10px] text-slate-500 tracking-wider font-semibold uppercase">Response Body</label>
            <pre className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-emerald-400 overflow-auto max-h-[220px] min-h-[220px]">
              {executionResult ? JSON.stringify(executionResult, null, 2) : '// Awaiting execution...'}
            </pre>
          </div>
        </div>
      </div>

      {/* HUMAN EXPLANATION PANEL */}
      {explanation && (
        <div className="mt-6 bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex flex-col space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Bot size={16} className="text-indigo-400 font-bold" />
            <h3 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">AI Copilot Explanation</h3>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 text-xs leading-relaxed">
            {renderMarkdown(explanation)}
          </div>
        </div>
      )}

      {/* Dynamic Security Policy Alert for Blocks */}
      {executionResult && executionResult.status === 'BLOCKED' && (
        <div className="mb-6 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl"></div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <Shield size={20} className="animate-pulse" />
            </div>
            <div className="space-y-2 text-xs">
              <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                Enterprise Gateway Block Interception
              </h4>
              <p className="text-slate-300 leading-relaxed">
                The Security Gateway intercepted the command because it violated active access policies.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 mt-2 font-mono">
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-semibold">Decision</span>
                  <span className="text-rose-400 font-bold">{executionResult.decision}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-semibold">Operation</span>
                  <span className="text-white font-semibold capitalize">{executionResult.requested_operation}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-semibold">Failed Stage</span>
                  <span className="text-white font-semibold">{executionResult.failed_stage}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-semibold">Timestamp</span>
                  <span className="text-slate-400 font-semibold">{new Date(executionResult.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800/60">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Policy Violation Reason</span>
                <p className="text-slate-200 mt-1 font-medium bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40 font-mono text-[11px]">
                  {executionResult.reason}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PIPELINE VISUALIZATION & DYNAMIC SESSION CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Info size={14} className="text-indigo-400" />
          Enterprise Security Gateway - Execution Flow Graph (Phase 3 & 4)
        </h3>

        {/* Active Session Context Info Card */}
        {sessionInfo && (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Shield size={16} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Active Session Context</p>
                <p className="text-xs font-bold text-slate-200 mt-0.5">Automated Context Injection</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-mono">
              <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block font-semibold">User ID</span>
                <span className="text-white font-bold text-[11px]">{sessionInfo.user_id}</span>
              </div>
              <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block font-semibold">Assigned Role</span>
                <span className="text-white font-bold text-[11px]">{sessionInfo.role}</span>
              </div>
              <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block font-semibold">Access Region</span>
                <span className="text-white font-bold text-[11px]">{sessionInfo.region}</span>
              </div>
              <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block font-semibold">Department</span>
                <span className="text-white font-bold text-[11px]">{sessionInfo.department}</span>
              </div>
            </div>
          </div>
        )}

        {/* 9-stage colored flow visualizer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-3 text-center text-[10px] font-mono">
          {steps.map((step, idx) => renderStepNode(step, idx))}
        </div>

        <p className="text-[10px] text-slate-500 leading-relaxed italic">
          *Note: All natural language prompts are validated, translated by Groq, and routed through the ABAC gateway prior to dispatch.
        </p>
      </div>
    </div>
  );
};

const renderMarkdown = (text) => {
  if (!text) return null;
  
  return text.split('\n').map((line, idx) => {
    let cleanLine = line;
    let isBullet = false;
    
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
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
      parts.push(<strong key={match.index} className="text-slate-100 font-semibold">{match[1]}</strong>);
      currentIdx = regex.lastIndex;
    }
    if (currentIdx < cleanLine.length) {
      parts.push(cleanLine.substring(currentIdx));
    }
    
    if (isBullet) {
      return (
        <li key={idx} className="list-disc ml-5 mb-1.5 text-slate-300 text-xs leading-relaxed">
          {parts.length > 0 ? parts : cleanLine}
        </li>
      );
    }
    
    return (
      <p key={idx} className="mb-2 text-slate-300 text-xs leading-relaxed">
        {parts.length > 0 ? parts : cleanLine}
      </p>
    );
  });
};

export default AIWorkspace;
