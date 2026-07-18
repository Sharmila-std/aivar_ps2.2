import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  KeyRound, 
  Mail, 
  AlertCircle, 
  Shield, 
  Play, 
  FileText, 
  Lock, 
  Activity, 
  Cpu, 
  Layers 
} from 'lucide-react';
import api from '../api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/api/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token, employee_id, full_name, role_name, region, department } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify({ employee_id, full_name, role_name, region, department }));
      
      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        'Unable to reach server. Ensure backend is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Layers size={22} />,
      title: "Policy Simulation",
      desc: "Test and validate security policies before deployment."
    },
    {
      icon: <Play size={22} />,
      title: "Attack Replay",
      desc: "Replay and analyze security incidents to improve defenses."
    },
    {
      icon: <FileText size={22} />,
      title: "Comprehensive Audit Logging",
      desc: "Maintain detailed logs for compliance and forensic analysis."
    },
    {
      icon: <Lock size={22} />,
      title: "PII Detection & Protection",
      desc: "Automatically detect and secure sensitive information."
    },
    {
      icon: <KeyRound size={22} />,
      title: "Secure Auth & Access",
      desc: "Enterprise-grade identity and access management."
    },
    {
      icon: <Activity size={22} />,
      title: "Real-Time AI Monitoring",
      desc: "Inspect and secure AI interactions as they happen."
    },
    {
      icon: <Shield size={22} />,
      title: "Enterprise AI Gateway",
      desc: "Centralized control over AI models and tool permissions."
    },
    {
      icon: <Cpu size={22} />,
      title: "LLM Security Guardrails",
      desc: "Prevent prompt injection, data leakage, and unauthorized tool access."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start px-6 py-16 relative overflow-hidden font-sans">
      
      {/* Decorative production-grade glowing background mesh */}
      <div className="absolute top-[-10%] left-[-15%] w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[160px] animate-pulse duration-[9000ms] pointer-events-none"></div>
      <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[160px] animate-pulse duration-[7000ms] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-[140px] pointer-events-none"></div>

      {/* 1. Header Section: Product Branding (Top) */}
      <div className="w-full max-w-4xl flex flex-col items-center text-center z-10 mb-8">
        <div className="flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800/80 backdrop-blur-md">
          <Shield size={16} className="text-blue-400" />
          <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-300">Security Gateway Proxy</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight leading-none mb-3">
          SecureScope Gateway
        </h1>
        
        <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-indigo-400 max-w-2xl">
          An Enterprise AI Security Gateway & Tool Permission Proxy
        </h3>
        
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-3 leading-relaxed italic border-t border-slate-900/80 pt-3">
          "Secure AI interactions with real-time policy enforcement, comprehensive audit trails, and enterprise-grade access control."
        </p>
      </div>

      {/* 2. Middle Section: Login Box (Center) */}
      <div className="w-full max-w-md z-10 mb-16">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative">
          
          <div className="flex flex-col items-center mb-6 text-center">
            <h2 className="text-lg font-bold text-slate-100">Sign In to Dashboard</h2>
            <p className="text-[11px] text-slate-400 mt-1">Enter your administrative or customer credentials</p>
          </div>

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Email or Customer ID</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                  <Mail size={15} />
                </span>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@securescope.ai or CUS000021"
                  className="w-full bg-slate-950 border border-slate-800/60 focus:border-indigo-500/80 rounded-xl py-3 pl-11 pr-4 text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Security Password</label>
                <a 
                  href="#forgot" 
                  onClick={(e) => { e.preventDefault(); alert("Please contact your system administrator to reset credentials."); }}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                  <KeyRound size={15} />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800/60 focus:border-indigo-500/80 rounded-xl py-3 pl-11 pr-4 text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all duration-200"
                />
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center pt-1">
              <input
                id="remember_me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 bg-slate-950 border-slate-800 text-indigo-600 rounded focus:ring-indigo-500/40 focus:ring-offset-slate-900 focus:outline-none"
              />
              <label htmlFor="remember_me" className="ml-2 text-[11px] text-slate-400 select-none">
                Remember this session
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-blue-800 disabled:to-indigo-800 text-slate-100 rounded-xl font-semibold text-xs transition-all duration-300 mt-2 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20"
            >
              {loading ? 'Authenticating Gateway...' : 'Sign In'}
            </button>
          </form>

          {/* Test Credentials Info */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-[9px] text-slate-500 uppercase tracking-widest leading-normal">
              For Demo / Testing, use credentials:
              <br />
              <span className="text-indigo-400 font-semibold font-mono">admin@securescope.ai</span> / <span className="text-indigo-400 font-semibold font-mono">Admin@123</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Bottom Section: Features Showcase (Below) */}
      <div className="w-full max-w-6xl z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-px w-20 bg-gradient-to-r from-transparent via-indigo-500 to-transparent mb-4"></div>
          <h2 className="text-xl font-bold text-slate-200">Advanced Security Features</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">Comprehensive enterprise-grade safeguards securing tool interactions and model bounds.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div 
              key={i} 
              className="bg-slate-900/30 border border-slate-800/50 hover:border-slate-700/60 p-5 rounded-2xl flex flex-col justify-start backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 group"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-colors mb-3">
                {f.icon}
              </div>
              <h4 className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                {f.title}
              </h4>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Login;

