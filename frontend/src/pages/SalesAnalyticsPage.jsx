import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  ShoppingBag, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  Zap,
  RefreshCw,
  PieChart as PieIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  Cell 
} from 'recharts';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function SalesAnalyticsPage() {
  const { activeStore, openEvidence } = useAuth();

  const [timeframe, setTimeframe] = useState('daily');
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const storeParam = activeStore === 'All Stores' ? null : activeStore;
      const res = await api.getSalesAnalytics({
        timeframe,
        days,
        store_id: storeParam || undefined
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load sales analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [timeframe, days, activeStore]);

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <LoadingSpinner text="Aggregating sales transactions across stores..." />
      </div>
    );
  }

  const summary = data?.summary || {};
  const trends = data?.trends || [];
  const categories = data?.categories || [];
  const bestSellers = data?.best_sellers || [];
  const slowMovers = data?.slow_movers || [];
  const spikes = data?.sales_spikes || [];
  const drops = data?.sales_drops || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">Sales Analytics & Anomaly Engine</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Historical transaction metrics, category margins, and automated velocity deviation detection
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Horizon Window */}
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-xs">
            {[
              { label: '7D', value: 7 },
              { label: '30D', value: 30 },
              { label: '60D', value: 60 },
              { label: '90D', value: 90 },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setDays(t.value)}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  days === t.value 
                    ? 'bg-neutral-800 text-neutral-100 shadow-sm' 
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Aggregation Timeframe */}
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-xs">
            {[
              { label: 'Daily', value: 'daily' },
              { label: 'Weekly', value: 'weekly' },
              { label: 'Monthly', value: 'monthly' },
            ].map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  timeframe === tf.value 
                    ? 'bg-neutral-800 text-neutral-100 shadow-sm' 
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchSalesData}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={`Total Revenue (${days}D)`}
          value={`$${summary.total_revenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`}
          subtitle={`${summary.total_orders || 0} total sales orders`}
          icon={DollarSign}
          evidenceData={{
            source_tables: ['sales'],
            formula: `Sum(total_amount) within ${days}-day evaluation window`,
            values_used: { total_revenue: summary.total_revenue, days_evaluated: days }
          }}
        />

        <StatCard
          title="Total Units Sold"
          value={summary.total_units_sold?.toLocaleString() || 0}
          subtitle={`Avg ${(summary.total_units_sold / days).toFixed(1)} units/day velocity`}
          icon={ShoppingBag}
          evidenceData={{
            source_tables: ['sales'],
            formula: 'Sum(quantity_sold)',
            values_used: { total_units: summary.total_units_sold }
          }}
        />

        <StatCard
          title="Average Order Value"
          value={`$${summary.average_order_value?.toFixed(2) || '0.00'}`}
          subtitle="Per customer transaction"
          icon={TrendingUp}
          evidenceData={{
            source_tables: ['sales'],
            formula: 'Total Revenue / Total Orders count',
            values_used: {
              total_revenue: summary.total_revenue,
              total_orders: summary.total_orders
            }
          }}
        />

        <StatCard
          title="Average Selling Price"
          value={`$${summary.average_selling_price?.toFixed(2) || '0.00'}`}
          subtitle="Across active catalog"
          icon={BarChart3}
          evidenceData={{
            source_tables: ['sales', 'products'],
            formula: 'Weighted average price per unit sold',
            values_used: { avg_selling_price: summary.average_selling_price }
          }}
        />
      </div>

      {/* Sales Trajectory Trend Chart */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-100">
              Revenue & Volume Trajectory ({timeframe.toUpperCase()})
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Evaluating period: <span className="font-mono text-neutral-300">{data?.date_range?.start}</span> to <span className="font-mono text-neutral-300">{data?.date_range?.end}</span>
            </p>
          </div>
          <button
            onClick={() => openEvidence({
              title: "Sales Trend Aggregation Proof",
              source_tables: ["sales"],
              formula: "Grouped by interval -> Sum(Sale.total_amount) and Sum(Sale.quantity_sold)",
              values_used: { interval: timeframe, intervals_count: trends.length }
            })}
            className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-emerald-400 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit Evidence</span>
          </button>
        </div>

        {trends.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-neutral-400">
            <BarChart3 className="w-8 h-8 text-neutral-600 mb-2" />
            <p className="text-xs font-medium text-neutral-300">No sales data available for analysis.</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">Import sales records to begin tracking revenue trajectories, category margins, and velocity anomalies.</p>
          </div>
        ) : (
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px', color: '#f4f4f5' }}
                  formatter={(value, name) => [name === 'revenue' ? `$${Number(value).toFixed(2)}` : `${value} units`, name === 'revenue' ? 'Revenue' : 'Units Sold']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#salesRevGrad)" name="revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Anomaly Detection Radar: Spikes & Drops */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sales Spikes */}
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-100">Demand Surges & Spikes</h3>
                <p className="text-[11px] text-neutral-400">Recent 7-day ADS &gt; 1.5&times; baseline</p>
              </div>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-emerald-400 border border-neutral-700">
              {spikes.length} Surges
            </span>
          </div>

          {spikes.length === 0 ? (
            <p className="text-xs text-neutral-500 py-4 text-center">No sudden sales surges detected in the current window.</p>
          ) : (
            <div className="space-y-3">
              {spikes.map((s) => (
                <div key={s.product_id} className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-200">{s.product_name}</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">+{s.percent_change}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                    <span>Recent Velocity: {s.recent_ads}/day</span>
                    <span>Baseline: {s.baseline_ads}/day</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">{s.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales Drops */}
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-400">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-100">Sales Drops & Declines</h3>
                <p className="text-[11px] text-neutral-400">Recent 7-day ADS &lt; 0.5&times; baseline</p>
              </div>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-rose-400 border border-neutral-700">
              {drops.length} Drops
            </span>
          </div>

          {drops.length === 0 ? (
            <p className="text-xs text-neutral-500 py-4 text-center">No drastic sales drops detected across active products.</p>
          ) : (
            <div className="space-y-3">
              {drops.map((d) => (
                <div key={d.product_id} className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-200">{d.product_name}</span>
                    <span className="text-xs font-mono font-bold text-rose-400">{d.percent_change}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                    <span>Recent Velocity: {d.recent_ads}/day</span>
                    <span>Baseline: {d.baseline_ads}/day</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">{d.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Category Contribution & Margin Table */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-100">Category Profitability & Contribution</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Calculated using database cost price and realized sales amounts</p>
          </div>
          <button
            onClick={() => openEvidence({
              title: "Gross Margin Proof",
              source_tables: ["sales", "products"],
              formula: "GrossMargin% = ((CategoryRevenue - CategoryCost) / CategoryRevenue) * 100",
              values_used: { categories_evaluated: categories.length }
            })}
            className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-emerald-400 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audit</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 font-medium">
              <tr>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Revenue</th>
                <th className="py-3 px-4">Units Sold</th>
                <th className="py-3 px-4">Revenue Share</th>
                <th className="py-3 px-4">Gross Profit</th>
                <th className="py-3 px-4">Gross Margin (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {categories.map((c) => (
                <tr key={c.category} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-neutral-200">
                    {c.category}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-neutral-200">
                    ${c.revenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-neutral-300">
                    {c.units} units
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${c.revenue_share_pct}%` }} />
                      </div>
                      <span className="font-mono text-neutral-400">{c.revenue_share_pct}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-neutral-200 font-medium">
                    ${c.gross_profit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                    {c.gross_margin_pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 10 Best-Selling Products Table */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <h2 className="text-base font-semibold text-neutral-100">Top Performing Products (by Revenue)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 font-medium">
              <tr>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Units Sold</th>
                <th className="py-3 px-4">Revenue</th>
                <th className="py-3 px-4">Daily Velocity (ADS)</th>
                <th className="py-3 px-4">Gross Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {bestSellers.map((prod, idx) => (
                <tr key={prod.product_id} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-neutral-400">
                    #{idx + 1} {prod.product_id}
                  </td>
                  <td className="py-3 px-4 font-semibold text-neutral-200">
                    <Link to={`/products/${prod.product_id}`} className="hover:text-emerald-400 transition-colors">
                      {prod.product_name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-neutral-400">{prod.category}</td>
                  <td className="py-3 px-4 font-mono text-neutral-200">${prod.selling_price?.toFixed(2)}</td>
                  <td className="py-3 px-4 font-mono font-bold text-neutral-100">{prod.total_units}</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">${prod.total_revenue?.toFixed(2)}</td>
                  <td className="py-3 px-4 font-mono text-neutral-300">{prod.average_daily_sales} /day</td>
                  <td className="py-3 px-4 font-mono text-neutral-300">{prod.gross_margin_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
