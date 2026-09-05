import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User as UserIcon, 
  ShieldCheck, 
  Clock, 
  HelpCircle, 
  CheckCircle, 
  Trash2, 
  ChevronRight, 
  Database,
  ArrowRight,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function CopilotPage() {
  const { activeStore, openEvidence } = useAuth();

  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'copilot',
      text: "Hello! I am your **StockSense AI Copilot**. I analyze your live sales, product, and inventory database to provide evidence-backed decision support without hallucinating.\n\nAsk me anything about stockout risks, velocity shifts, reorder priorities, or click one of the suggested queries below.",
      evidence: null,
      created_at: new Date().toLocaleTimeString()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const messagesEndRef = useRef(null);

  const suggestedQueries = [
    "What products are running out?",
    "What should I reorder today?",
    "Which products are overstocked?",
    "Which products had a sales drop?",
    "Which products are selling faster than usual?",
    "What is my highest priority today?",
    "What happens if demand increases by 25%?",
    "Why is Item PRD-101 high risk?",
    "Show the evidence behind top recommendations"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await api.getCopilotHistory();
      setHistory(res.history || []);
    } catch (err) {
      console.log("Failed to load history:", err);
    }
  };

  const handleSend = async (queryText) => {
    const textToSend = queryText || query;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      created_at: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const storeParam = activeStore === 'All Stores' ? null : activeStore;
      const res = await api.askCopilot(textToSend, storeParam);

      const botMsg = {
        id: res.query_id || `bot-${Date.now()}`,
        sender: 'copilot',
        text: res.direct_answer,
        intent: res.intent,
        date_range: res.date_range,
        products_involved: res.products_involved,
        context_data: res.context_data,
        evidence: res.evidence,
        created_at: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, botMsg]);
      loadHistory();
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'copilot',
          text: `⚠️ Error executing query: ${err.message}. Please verify your database connection or settings.`,
          created_at: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await api.clearCopilotHistory();
      setHistory([]);
    } catch (err) {
      alert("Failed to clear history");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-5rem)] flex flex-col gap-4 animate-fadeIn">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-100">StockSense AI Copilot</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-emerald-300 border border-neutral-700">
                Grounded Decision Support
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Deterministic Python retrieval &bull; Strict hallucination guardrails &bull; Store: {activeStore}
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-rose-400 text-xs transition-colors flex items-center gap-1.5"
            title="Clear AI Conversation History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear History</span>
          </button>
        )}
      </div>

      {/* Main Chat Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* Chat Messages Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-full rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl">
          
          {/* Messages Feed */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold font-mono ${
                  msg.sender === 'user' 
                    ? 'bg-neutral-100 text-neutral-950' 
                    : 'bg-emerald-950/80 border border-emerald-800/60 text-emerald-400'
                }`}>
                  {msg.sender === 'user' ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Body */}
                <div className={`rounded-2xl p-4 text-xs leading-relaxed space-y-3 ${
                  msg.sender === 'user'
                    ? 'bg-neutral-800 text-neutral-100 border border-neutral-700'
                    : 'bg-neutral-950/90 text-neutral-200 border border-neutral-800'
                }`}>
                  
                  {/* Text content with markdown formatting */}
                  <div className="whitespace-pre-wrap space-y-2">
                    {msg.text.split('\n').map((line, idx) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <p key={idx} className="font-bold text-neutral-100">{line.replace(/\*\*/g, '')}</p>;
                      } else if (line.startsWith('- **')) {
                        return (
                          <div key={idx} className="flex items-start gap-2 pl-2">
                            <span className="text-emerald-400 font-bold">&bull;</span>
                            <span dangerouslySetInnerHTML={{ __html: line.replace(/^- /, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                          </div>
                        );
                      }
                      return <p key={idx} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />;
                    })}
                  </div>

                  {/* Grounded Evidence Badge / Button */}
                  {msg.evidence && (
                    <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
                      <span className="font-mono text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verified Database Snapshot</span>
                      </span>
                      <button
                        onClick={() => openEvidence({
                          title: `AI Copilot Grounding: ${msg.intent || 'Query'}`,
                          source_tables: msg.evidence?.source_tables || ['products', 'inventory', 'sales'],
                          date_range: msg.date_range,
                          formula: 'Deterministic calculation context retrieved from real database and fed to Gemini 1.5 with zero-hallucination constraint.',
                          values_used: msg.context_data || {}
                        })}
                        className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition-colors"
                      >
                        Inspect Audit Proof
                      </button>
                    </div>
                  )}

                  <div className="text-[10px] text-neutral-500 font-mono text-right">
                    {msg.created_at}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Extracting verified records & computing deterministic metrics...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-neutral-950 border-t border-neutral-800">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about stockout risks, what to reorder, velocity shifts, or What-Ifs..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!query.trim() || loading}
                className="p-2.5 rounded-xl bg-neutral-100 hover:bg-white disabled:bg-neutral-800 text-neutral-950 disabled:text-neutral-600 transition-all font-bold shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

        {/* Sidebar: Recommended Prompt Chips & Grounding Info (4 cols) */}
        <div className="lg:col-span-4 flex flex-col h-full space-y-4 overflow-y-auto">
          
          {/* Suggested Questions */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-300">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>Recommended Prompts</span>
            </div>
            <div className="space-y-1.5">
              {suggestedQueries.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  className="w-full text-left p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-emerald-500/50 hover:bg-neutral-800/40 text-xs text-neutral-300 transition-all flex items-center justify-between group"
                >
                  <span className="truncate pr-2">{q}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-emerald-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* AI Grounding Architecture Card */}
          <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Grounded Architecture</span>
            </div>
            <ul className="text-xs text-neutral-400 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Backend identifies query intent & retrieves verified SQL records.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Python calculates velocity, runway, and revenue at risk.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Gemini generates natural language strictly bound to structured numbers.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>If data is missing, Copilot declares insufficient data rather than guessing.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
