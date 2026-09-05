import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  Truck, 
  ShieldCheck, 
  ArrowRight, 
  RefreshCw, 
  Info,
  DollarSign,
  Package,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function SimulatorPage() {
  const { activeStore, openEvidence } = useAuth();

  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  
  // Simulator Parameters
  const [demandChangePct, setDemandChangePct] = useState(25);
  const [futureDays, setFutureDays] = useState(30);
  const [leadTimeOverride, setLeadTimeOverride] = useState('');
  const [restockQty, setRestockQty] = useState(0);
  const [restockDay, setRestockDay] = useState('');

  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  // Load products list for dropdown
  useEffect(() => {
    api.getProducts({ active_only: true })
      .then(res => {
        const prods = res.products || [];
        setProducts(prods);
        if (prods.length > 0) {
          setSelectedProductId(prods[0].product_id);
          // Set initial lead time from product
          setLeadTimeOverride(prods[0].lead_time_days || 7);
          setRestockDay(prods[0].lead_time_days || 7);
        }
      })
      .catch(err => console.error("Error loading products for simulator:", err))
      .finally(() => setLoading(false));
  }, []);

  // Run simulation whenever parameters change
  const runCurrentSimulation = async () => {
    if (!selectedProductId) return;
    setSimulating(true);
    try {
      const payload = {
        product_id: selectedProductId,
        demand_change_pct: parseFloat(demandChangePct) || 0,
        future_days: parseInt(futureDays) || 30,
        lead_time_override: leadTimeOverride !== '' ? parseInt(leadTimeOverride) : undefined,
        restock_qty: parseInt(restockQty) || 0,
        restock_day: restockDay !== '' ? parseInt(restockDay) : undefined
      };

      const res = await api.runSimulation(payload);
      setSimResult(res);
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    if (selectedProductId) {
      runCurrentSimulation();
    }
  }, [selectedProductId, demandChangePct, futureDays, leadTimeOverride, restockQty, restockDay]);

  const handleProductSelect = (pid) => {
    setSelectedProductId(pid);
    const p = products.find(prod => prod.product_id === pid);
    if (p) {
      setLeadTimeOverride(p.lead_time_days || 7);
      setRestockDay(p.lead_time_days || 7);
    }
  };

  if (loading && !simResult && products.length > 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <LoadingSpinner text="Initializing What-If Simulation Sandbox..." />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <EmptyState
          icon={Sliders}
          title="Insufficient Data for Simulation"
          description="Insufficient data for simulation. Please connect your retail database or import your product catalog and sales records in Data Management to run What-If simulations."
          actionLabel="Go to Data Management"
          actionLink="/data-management"
        />
      </div>
    );
  }

  // Combine trajectories for chart
  const chartData = [];
  if (simResult?.trajectories) {
    const baseTraj = simResult.trajectories.baseline || [];
    const simTraj = simResult.trajectories.simulated || [];

    for (let i = 0; i < baseTraj.length; i++) {
      chartData.push({
        day: baseTraj[i].day,
        date_label: baseTraj[i].date_label,
        baselineStock: baseTraj[i].stock,
        simulatedStock: simTraj[i]?.stock ?? 0,
        reorderThreshold: simResult.product?.reorder_level || 10
      });
    }
  }

  const baseline = simResult?.baseline || {};
  const simulated = simResult?.simulated || {};
  const comparison = simResult?.comparison || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">What-If Inventory Simulator</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-[11px] font-mono text-emerald-300">
              Core Innovation
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Dynamic scenario modeling &bull; Test sales spikes, supply chain delays, and emergency restock timing
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setDemandChangePct(0);
              setFutureDays(30);
              setRestockQty(0);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
            <span>Reset Baseline</span>
          </button>

          <button
            onClick={() => openEvidence({
              title: `What-If Simulation Evidence: ${simResult?.product_name}`,
              ...simResult?.evidence,
              values_used: {
                baseline_ads: baseline.average_daily_sales,
                adjusted_ads: simulated.adjusted_daily_demand,
                current_stock: baseline.current_stock,
                simulation_days: futureDays,
                projected_shortage: simulated.shortage_units,
                revenue_at_risk: simulated.revenue_at_risk
              }
            })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-semibold text-neutral-100 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Audit Proof</span>
          </button>
        </div>
      </div>

      {/* Simulator Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Interactive Controls Sandbox (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-6 shadow-xl">
            
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Simulation Parameters</span>
              </span>
              {simulating && <span className="text-xs font-mono text-emerald-400 animate-pulse">Recalculating...</span>}
            </div>

            {/* Product Selector */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-2">
                Select Product SKU to Simulate
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 font-medium"
              >
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.product_name} ({p.category} &bull; ${p.selling_price?.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Slider 1: Demand Shift % */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-300 uppercase tracking-wider">
                  Expected Sales Shift
                </label>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  demandChangePct > 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' :
                  demandChangePct < 0 ? 'bg-rose-950 text-rose-300 border border-rose-800/40' :
                  'bg-neutral-800 text-neutral-300'
                }`}>
                  {demandChangePct > 0 ? `+${demandChangePct}% Surge` : demandChangePct < 0 ? `${demandChangePct}% Drop` : '0% (Baseline)'}
                </span>
              </div>
              <input
                type="range"
                min="-80"
                max="200"
                step="5"
                value={demandChangePct}
                onChange={(e) => setDemandChangePct(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-neutral-950 rounded-lg cursor-pointer h-2"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                <span>-80% Slump</span>
                <span>0% Baseline</span>
                <span>+200% Viral Spike</span>
              </div>
            </div>

            {/* Slider 2: Forecast Horizon Days */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-300 uppercase tracking-wider">
                  Simulation Horizon
                </label>
                <span className="text-xs font-mono font-bold text-neutral-200">
                  {futureDays} Days Ahead
                </span>
              </div>
              <input
                type="range"
                min="7"
                max="90"
                step="1"
                value={futureDays}
                onChange={(e) => setFutureDays(parseInt(e.target.value))}
                className="w-full accent-emerald-500 bg-neutral-950 rounded-lg cursor-pointer h-2"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                <span>7 Days</span>
                <span>30 Days</span>
                <span>60 Days</span>
                <span>90 Days</span>
              </div>
            </div>

            {/* Supply Chain Adjustments */}
            <div className="pt-4 border-t border-neutral-800 space-y-4">
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider block">
                Supply Chain & Restock Modifiers (Optional)
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={leadTimeOverride}
                    onChange={(e) => setLeadTimeOverride(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-100 focus:outline-none focus:border-emerald-500"
                    placeholder="7"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Incoming Batch Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-100 focus:outline-none focus:border-emerald-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {parseInt(restockQty) > 0 && (
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Scheduled Delivery Day (Day 1 to {futureDays})</label>
                  <input
                    type="number"
                    min="1"
                    max={futureDays}
                    value={restockDay}
                    onChange={(e) => setRestockDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-100 focus:outline-none focus:border-emerald-500"
                    placeholder="7"
                  />
                </div>
              )}
            </div>

          </div>

          {/* Actionable Scenario Recommendation Card */}
          {simResult && (
            <div className={`p-6 rounded-2xl border space-y-3 ${
              simulated.risk_level === 'Critical' ? 'bg-rose-950/20 border-rose-900/50' :
              simulated.risk_level === 'High' ? 'bg-amber-950/20 border-amber-900/50' :
              'bg-emerald-950/20 border-emerald-900/50'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  Automated Recommendation
                </span>
                <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                  simulated.risk_level === 'Critical' ? 'bg-rose-900 text-rose-200' :
                  simulated.risk_level === 'High' ? 'bg-amber-900 text-amber-200' :
                  'bg-emerald-900 text-emerald-200'
                }`}>
                  {simulated.risk_level}
                </span>
              </div>

              <p className="text-xs text-neutral-200 font-medium leading-relaxed">
                {simulated.recommended_action}
              </p>

              <div className="pt-2 border-t border-neutral-800/60 text-[11px] text-neutral-400">
                <span>{simResult?.evidence?.disclaimer}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Simulation Runway Trajectory & Metrics Matrix (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Headline Scenario Metrics Comparison */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] text-neutral-400 font-mono uppercase">Adjusted Velocity</span>
              <p className="text-xl font-bold font-mono text-neutral-100 mt-1">
                {simulated.adjusted_daily_demand} <span className="text-xs font-normal text-neutral-400">/day</span>
              </p>
              <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">
                Base: {baseline.average_daily_sales}/day
              </span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] text-neutral-400 font-mono uppercase">Stock Coverage</span>
              <p className="text-xl font-bold font-mono text-neutral-100 mt-1">
                {simulated.coverage_days > 900 ? 'N/A' : `${simulated.coverage_days}d`}
              </p>
              <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">
                Base: {baseline.coverage_days}d ({comparison.runway_diff_days}d diff)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] text-neutral-400 font-mono uppercase">Stock-Out Day</span>
              <p className={`text-xl font-bold font-mono mt-1 ${simulated.stockout_day ? 'text-rose-400' : 'text-emerald-400'}`}>
                {simulated.stockout_day ? `Day ${simulated.stockout_day}` : 'No Stockout'}
              </p>
              <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">
                {simulated.stockout_date ? simulated.stockout_date : 'Safe throughout'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] text-neutral-400 font-mono uppercase">Simulated Risk</span>
              <p className={`text-xl font-bold font-mono mt-1 ${simulated.revenue_at_risk > 0 ? 'text-rose-400' : 'text-neutral-100'}`}>
                ${simulated.revenue_at_risk?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">
                Shortage: {simulated.shortage_units} units
              </span>
            </div>

          </div>

          {/* Interactive Trajectory Chart (Baseline vs Simulated) */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-neutral-100">
                  Stock Runway Depletion Curve ({futureDays}-Day Projection)
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Visualizing stock degradation under Baseline vs Simulated Demand
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-neutral-400">
                  <span className="w-2.5 h-0.5 bg-neutral-500" />
                  <span>Baseline Runway</span>
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2.5 h-0.5 bg-emerald-400" />
                  <span>Simulated Scenario</span>
                </span>
              </div>
            </div>

            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="date_label" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px', color: '#f4f4f5' }}
                    formatter={(value, name) => [
                      `${Number(value).toFixed(1)} units`, 
                      name === 'simulatedStock' ? 'Simulated Stock' : 'Baseline Stock'
                    ]}
                  />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Stockout Zero', fill: '#ef4444', fontSize: 10 }} />
                  <Line 
                    type="monotone" 
                    dataKey="baselineStock" 
                    stroke="#71717a" 
                    strokeWidth={2} 
                    strokeDasharray="4 4"
                    dot={false} 
                    name="baselineStock"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="simulatedStock" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={false} 
                    name="simulatedStock"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Baseline vs Simulated Difference Table */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-100">Scenario Variance Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Metric Dimension</th>
                    <th className="py-2.5 px-3">Baseline (Current Trend)</th>
                    <th className="py-2.5 px-3">Simulated Scenario</th>
                    <th className="py-2.5 px-3 text-right">Net Variance (&Delta;)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-mono">
                  <tr className="hover:bg-neutral-800/30">
                    <td className="py-2.5 px-3 text-neutral-300 font-sans">Total Cumulative Demand</td>
                    <td className="py-2.5 px-3 text-neutral-400">{baseline.total_demand} units</td>
                    <td className="py-2.5 px-3 text-neutral-200">{simulated.total_demand} units</td>
                    <td className="py-2.5 px-3 text-right font-bold text-neutral-100">
                      {comparison.demand_diff_units > 0 ? `+${comparison.demand_diff_units}` : comparison.demand_diff_units} units
                    </td>
                  </tr>
                  <tr className="hover:bg-neutral-800/30">
                    <td className="py-2.5 px-3 text-neutral-300 font-sans">Stock-out Occurrence</td>
                    <td className="py-2.5 px-3 text-neutral-400">{baseline.stockout_day ? `Day ${baseline.stockout_day}` : 'Never'}</td>
                    <td className="py-2.5 px-3 text-neutral-200">{simulated.stockout_day ? `Day ${simulated.stockout_day}` : 'Never'}</td>
                    <td className="py-2.5 px-3 text-right text-neutral-300">
                      {simulated.stockout_day && baseline.stockout_day ? `${simulated.stockout_day - baseline.stockout_day} days` : 'N/A'}
                    </td>
                  </tr>
                  <tr className="hover:bg-neutral-800/30">
                    <td className="py-2.5 px-3 text-neutral-300 font-sans">Estimated Shortfall Units</td>
                    <td className="py-2.5 px-3 text-neutral-400">{baseline.shortage_units} units</td>
                    <td className="py-2.5 px-3 text-rose-400 font-bold">{simulated.shortage_units} units</td>
                    <td className="py-2.5 px-3 text-right text-rose-400 font-bold">
                      {comparison.shortage_diff_units > 0 ? `+${comparison.shortage_diff_units}` : comparison.shortage_diff_units} units
                    </td>
                  </tr>
                  <tr className="hover:bg-neutral-800/30">
                    <td className="py-2.5 px-3 text-neutral-300 font-sans">Financial Exposure / Risk</td>
                    <td className="py-2.5 px-3 text-neutral-400">${baseline.revenue_at_risk?.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-rose-400 font-bold">${simulated.revenue_at_risk?.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-rose-400 font-bold">
                      ${comparison.revenue_risk_diff > 0 ? `+${comparison.revenue_risk_diff.toFixed(2)}` : comparison.revenue_risk_diff?.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
