import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Key, 
  Database, 
  Store, 
  ShieldCheck, 
  Cpu, 
  CheckCircle, 
  HelpCircle, 
  Sparkles,
  Server,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function SettingsPage() {
  const { activeStore, changeStore, availableStores } = useAuth();
  
  const [health, setHealth] = useState(null);
  const [geminiKey, setGeminiKey] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await api.getHealth();
      setHealth(res);
    } catch (err) {
      console.error("Health check error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleSaveKey = (e) => {
    e.preventDefault();
    if (geminiKey.trim()) {
      localStorage.setItem('stocksense_gemini_key', geminiKey.trim());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="pb-4 border-b border-neutral-800">
        <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">System Settings & Configuration</h1>
        <p className="text-xs text-neutral-400 mt-1">
          Configure Google Gemini API keys, environment settings, store preferences, and database parameters
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Settings saved locally! For server-wide persistence, you can also set GEMINI_API_KEY in your .env file.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Column: Form Configurations (7 cols) */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Gemini AI Configuration */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Google Gemini API Configuration</span>
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                health?.gemini_api_configured 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50' 
                  : 'bg-amber-950 text-amber-300 border border-amber-800/50'
              }`}>
                {health?.gemini_api_configured ? 'KEY DETECTED (.env)' : 'GROUNDED LOCAL ENGINE'}
              </span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              StockSense AI uses <strong>Google Gemini 1.5</strong> for natural-language synthesis while computing all underlying retail numbers deterministically in Python.
            </p>

            <form onSubmit={handleSaveKey} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1.5">
                  Gemini API Key (Optional Override)
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder={health?.gemini_api_configured ? "••••••••••••••••••••••••" : "AIzaSy..."}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-emerald-400 transition-colors"
                >
                  <span>Get Gemini API Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-white text-neutral-950 font-bold text-xs shadow-sm transition-all"
                >
                  Save API Key
                </button>
              </div>
            </form>
          </div>

          {/* Store Location Preference */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Store className="w-4 h-4 text-neutral-400" />
              <span>Default Store Filter</span>
            </span>
            <p className="text-xs text-neutral-400">
              Select your primary retail branch location to filter analytics and reorder schedules.
            </p>

            <select
              value={activeStore}
              onChange={(e) => changeStore(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
            >
              {availableStores.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Right Column: System Diagnostics (5 cols) */}
        <div className="md:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>System Health & Diagnostics</span>
              </span>
              <button 
                onClick={fetchHealth}
                className="p-1 rounded text-neutral-500 hover:text-neutral-200"
                title="Refresh Status"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-400">App Version:</span>
                <span className="text-neutral-200 font-bold">{health?.version || '2.4.0'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-400">Backend Server:</span>
                <span className="text-emerald-400">Python 3.14 / Flask</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-400">ORM Abstraction:</span>
                <span className="text-neutral-200">SQLAlchemy 2.0</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-400">Database Driver:</span>
                <span className="text-neutral-200 truncate max-w-[140px]">
                  {health?.database?.database_uri || 'sqlite:///stocksense.db'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-400">AI Model Protocol:</span>
                <span className="text-emerald-400">Gemini 1.5 Flash Grounded</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-neutral-400">Math Grounding:</span>
                <span className="text-emerald-400 font-bold">100% Deterministic</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-400 space-y-2">
            <span className="font-semibold text-neutral-200 block">Single Startup Command:</span>
            <code className="block p-2.5 rounded bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-emerald-300">
              python app.py
            </code>
            <p className="text-[11px] text-neutral-500">
              Serves backend REST endpoints on port 5000 and serves optimized frontend SPA assets automatically.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
