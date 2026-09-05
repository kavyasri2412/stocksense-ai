import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Box, 
  ArrowRight, 
  ShieldCheck, 
  Sliders, 
  Sparkles, 
  BarChart3, 
  AlertTriangle, 
  Database, 
  TrendingUp, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Cpu,
  ChevronRight
} from 'lucide-react';
import InventoryCubeCanvas from '../components/3d/InventoryCubeCanvas';
import { api } from '../services/api';

export default function LandingPage() {
  const [kpis, setKpis] = useState({
    total_sales_revenue: 0,
    total_products: 0,
    total_inventory_units: 0,
    today_revenue: 0
  });

  useEffect(() => {
    api.getDashboardSummary()
      .then(res => {
        if (res.kpis) setKpis(res.kpis);
      })
      .catch(err => console.log('Landing KPI fetch error:', err));
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-neutral-800">
      
      {/* Top Banner */}
      <div className="border-b border-neutral-800/80 bg-neutral-900/40 px-4 py-2 text-center text-xs font-mono text-neutral-400">
        <span className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-subtle" />
          <span>NexusTiQ24 PS03 Final Solution &bull; Production-Grade Decision Support System</span>
        </span>
      </div>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Deterministic Math + Grounded Gemini AI</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-100 leading-tight">
                Intelligent Sales & <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 via-neutral-300 to-neutral-500">
                  Inventory Copilot
                </span>
              </h1>

              <p className="text-base sm:text-lg text-neutral-400 max-w-2xl leading-relaxed">
                Empower small retail teams with real-time stock-out prevention, slow-moving inventory liquidation, deterministic priority rankings, interactive What-If simulations, and audit-backed AI answers.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 font-bold text-sm shadow-xl hover:shadow-2xl transition-all duration-200"
                >
                  <span>Open Executive Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/simulator"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 font-semibold text-sm transition-all"
                >
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Try What-If Simulator</span>
                </Link>
                <Link
                  to="/copilot"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 font-semibold text-sm transition-all"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Ask AI Copilot</span>
                </Link>
              </div>

              {/* Live Ticker Strip */}
              <div className="pt-6 border-t border-neutral-900 grid grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-neutral-500 font-mono uppercase">Connected SKUs</span>
                  <p className="text-xl font-bold font-mono text-neutral-200 mt-0.5">{kpis.total_products || 0} SKUs</p>
                </div>
                <div>
                  <span className="text-xs text-neutral-500 font-mono uppercase">Managed Units</span>
                  <p className="text-xl font-bold font-mono text-neutral-200 mt-0.5">{kpis.total_inventory_units ? kpis.total_inventory_units.toLocaleString() : 0} Units</p>
                </div>
                <div>
                  <span className="text-xs text-neutral-500 font-mono uppercase">Total Sales Revenue</span>
                  <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">${kpis.total_sales_revenue ? kpis.total_sales_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</p>
                </div>
              </div>
            </div>

            {/* Right 3D Visualizer */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl bg-neutral-900/60 border border-neutral-800 p-4 shadow-2xl backdrop-blur-md">
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1 rounded-md bg-neutral-950/80 border border-neutral-800 text-[11px] font-mono text-neutral-300">
                  <Box className="w-3.5 h-3.5 text-emerald-400" />
                  <span>3D Inventory Matrix Canvas</span>
                </div>
                
                <InventoryCubeCanvas height="420px" interactive={true} />

                <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 font-mono">
                  <span>Interactive Mouse Tilt &bull; 3D Engine</span>
                  <span className="text-emerald-400">FPS: 60 (WebGL)</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* The Retail Problem vs StockSense Solution */}
      <section className="py-16 border-t border-neutral-900 bg-neutral-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <h2 className="text-xs font-mono uppercase text-emerald-400 tracking-wider">Problem vs Solution</h2>
            <h3 className="text-3xl font-bold tracking-tight text-neutral-100">Engineered Specifically for Retail Realities</h3>
            <p className="text-sm text-neutral-400">
              Small retail businesses lose up to 18% of potential revenue due to silent stock-outs, sluggish reordering, and ungrounded inventory guesswork.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* The Old Way */}
            <div className="p-8 rounded-2xl bg-neutral-900/30 border border-rose-950/40 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-rose-950/30 border border-rose-900/40 text-xs font-semibold text-rose-300">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>The Traditional Retail Struggle</span>
              </div>
              <ul className="space-y-3 text-sm text-neutral-400">
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 font-bold font-mono mt-0.5">&times;</span>
                  <span>Spreadsheet chaos leading to surprise stockouts on high-margin fast movers.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 font-bold font-mono mt-0.5">&times;</span>
                  <span>AI tools hallucinating phantom sales numbers without access to real database records.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 font-bold font-mono mt-0.5">&times;</span>
                  <span>Tied-up working capital in slow-moving overstock with no liquidation triggers.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 font-bold font-mono mt-0.5">&times;</span>
                  <span>No ability to simulate what happens to stock runway if demand jumps 25% or supplier delays 5 days.</span>
                </li>
              </ul>
            </div>

            {/* The StockSense Way */}
            <div className="p-8 rounded-2xl bg-neutral-900/50 border border-emerald-950/40 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-950/40 border border-emerald-800/40 text-xs font-semibold text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>The StockSense AI Architecture</span>
              </div>
              <ul className="space-y-3 text-sm text-neutral-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>100% Deterministic Python Math:</strong> Runway days, ADS, velocity, and revenue at risk computed directly via SQLAlchemy.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Grounded Gemini AI Copilot:</strong> Strictly receives verified database snapshots and produces evidence-grounded answers.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Interactive What-If Simulator:</strong> Real-time trajectory modeling for demand surges, restock deliveries, and lead time delays.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Full Data Provenance Audit:</strong> One click shows exact source tables, math formulas, and timestamps for every single metric.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Core Innovation Modules Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
          <h2 className="text-xs font-mono uppercase text-emerald-400 tracking-wider">System Capabilities</h2>
          <h3 className="text-3xl font-bold tracking-tight text-neutral-100">Engineered for Every Operational Scenario</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Module 1: Priority Engine */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all hover-elevate flex flex-col justify-between">
            <div className="space-y-4">
              <div className="p-2.5 rounded-xl bg-neutral-800 border border-neutral-700 w-fit text-emerald-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-neutral-100">Today's Priority Ranking</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Deterministic ranking algorithm weighting stock runway, supplier lead time, sales velocity, and revenue at risk into immediate action triggers.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-500">Alert Engine</span>
              <Link to="/alerts" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                View Priorities <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Module 2: What-If Simulator */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all hover-elevate flex flex-col justify-between">
            <div className="space-y-4">
              <div className="p-2.5 rounded-xl bg-neutral-800 border border-neutral-700 w-fit text-emerald-400">
                <Sliders className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-neutral-100">What-If Inventory Sandbox</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Adjust expected sales growth (+/- %), simulation horizon, supplier delays, and restock arrival to plot dynamic stock runway trajectories.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-500">Simulator Engine</span>
              <Link to="/simulator" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                Launch Sandbox <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Module 3: Gemini AI Copilot */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all hover-elevate flex flex-col justify-between">
            <div className="space-y-4">
              <div className="p-2.5 rounded-xl bg-neutral-800 border border-neutral-700 w-fit text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-neutral-100">Grounded Gemini Copilot</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Natural conversational query assistant that answers questions strictly using verified database calculations with complete mathematical evidence.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-500">Gemini 1.5 Grounding</span>
              <Link to="/copilot" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                Start Chat <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* CTA Footer */}
      <section className="border-t border-neutral-900 bg-neutral-950 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-bold text-neutral-100">Ready to Take Control of Your Retail Inventory?</h2>
          <p className="text-sm text-neutral-400 max-w-xl mx-auto">
            Connect to your live database, import custom CSV records, or explore the pre-seeded realistic 60-day retail dataset now.
          </p>
          <div className="pt-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm shadow-xl transition-all"
            >
              <span>Launch StockSense AI Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
