import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  AlertCircle, 
  ArrowRight, 
  Box, 
  RefreshCw, 
  Sparkles, 
  Sliders, 
  ShieldCheck, 
  Layers, 
  Activity, 
  PieChart as PieIcon,
  HelpCircle,
  Truck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function DashboardPage() {
  const { activeStore, openEvidence } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [restockModalItem, setRestockModalItem] = useState(null);
  const [restockQty, setRestockQty] = useState(20);
  const [restockSuccessMsg, setRestockSuccessMsg] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const storeParam = activeStore === 'All Stores' ? null : activeStore;
      const res = await api.getDashboardSummary(storeParam);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to connect to database records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeStore]);

  const handleExecuteRestock = async () => {
    if (!restockModalItem) return;
    try {
      await api.restockProduct(restockModalItem.product_id, restockQty, activeStore);
      setRestockSuccessMsg(`Restocked ${restockQty} units of ${restockModalItem.product_name}!`);
      setRestockModalItem(null);
      fetchDashboardData();
      setTimeout(() => setRestockSuccessMsg(null), 4000);
    } catch (err) {
      alert(`Restock failed: ${err.message}`);
    }
  };

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <LoadingSpinner text="Querying database for real-time sales & inventory metrics..." />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <EmptyState
          icon={AlertCircle}
          title="Database Query Error"
          description={error}
          actionLabel="Retry Query"
          onAction={fetchDashboardData}
        />
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const priorities = data?.top_priorities || [];
  const trends = data?.recent_trends || [];
  const categories = data?.category_performance || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">Executive Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-[11px] font-mono text-emerald-400">
              Live DB
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time decision intelligence &bull; Reference evaluation: <span className="font-mono text-neutral-300">{kpis.reference_date || 'Today'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
            <span>Refresh</span>
          </button>

          <Link
            to="/copilot"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-semibold text-neutral-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ask Copilot</span>
          </Link>

          <Link
            to="/simulator"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-white text-neutral-950 text-xs font-bold transition-all shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>What-If Simulator</span>
          </Link>
        </div>
      </div>

      {/* Restock Toast Notification */}
      {restockSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{restockSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* Empty Database State Banner */}
      {(!kpis.total_products || kpis.total_products === 0) && (
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-neutral-800 text-neutral-300">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-100">No Business Data Available Yet</h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                Connect your retail database or import your sales, products, and inventory records via CSV/Excel in Data Management to begin real-time analysis.
              </p>
            </div>
          </div>
          <Link
            to="/data-management"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs shrink-0 transition-all shadow-sm"
          >
            <span>Import Retail Data</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Priority Alert Banner if Attention Items Exist */}
      {kpis.products_requiring_attention_today > 0 && (
        <div className="p-4 rounded-xl bg-neutral-900 border border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">
                {kpis.products_requiring_attention_today} Product(s) Require Management Attention Today
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {kpis.critical_stock_products || kpis.low_stock_products} stock-out risks detected with <strong>${data?.priority_summary?.total_revenue_at_risk?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</strong> total revenue at risk.
              </p>
            </div>
          </div>
          <Link
            to="/alerts"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold text-amber-300 transition-colors shrink-0"
          >
            <span>Inspect Priority Action List</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Headline KPI Metric Cards (8 Core Values) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Today's Revenue */}
        <StatCard
          title="Today's Revenue"
          value={`$${kpis.today_revenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`}
          subtitle={`Yesterday: $${kpis.yesterday_revenue?.toFixed(2) || '0.00'}`}
          trend={kpis.revenue_growth_day_pct}
          trendDirection={kpis.revenue_growth_day_pct >= 0 ? 'up' : 'down'}
          icon={DollarSign}
          variant="default"
          evidenceData={{
            source_tables: ['sales'],
            formula: 'Sum(Sale.total_amount) WHERE sale_date = Today',
            values_used: {
              today_revenue: kpis.today_revenue,
              yesterday_revenue: kpis.yesterday_revenue,
              growth_pct: `${kpis.revenue_growth_day_pct}%`
            }
          }}
        />

        {/* 2. 30-Day Total Sales */}
        <StatCard
          title="30-Day Sales Revenue"
          value={`$${kpis.revenue_30d?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`}
          subtitle={`${kpis.total_units_sold?.toLocaleString() || 0} units sold lifetime`}
          icon={TrendingUp}
          variant="default"
          evidenceData={{
            source_tables: ['sales'],
            formula: 'Sum(Sale.total_amount) in last 30 days',
            values_used: {
              revenue_30d: kpis.revenue_30d,
              lifetime_revenue: kpis.total_sales_revenue,
              lifetime_units: kpis.total_units_sold
            }
          }}
        />

        {/* 3. Current Inventory Value */}
        <StatCard
          title="Inventory Cost Value"
          value={`$${kpis.current_inventory_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`}
          subtitle={`${kpis.total_inventory_units?.toLocaleString() || 0} total units held`}
          icon={Box}
          variant="default"
          evidenceData={{
            source_tables: ['inventory', 'products'],
            formula: 'Sum(current_stock * cost_price)',
            values_used: {
              total_inventory_units: kpis.total_inventory_units,
              inventory_cost_value: kpis.current_inventory_value,
              inventory_retail_value: kpis.current_inventory_retail_value
            }
          }}
        />

        {/* 4. Products Requiring Attention */}
        <StatCard
          title="Attention Today"
          value={kpis.products_requiring_attention_today || 0}
          subtitle={`${kpis.low_stock_products || 0} Low/Depleted &bull; ${kpis.overstocked_products || 0} Overstocked`}
          icon={AlertCircle}
          variant={kpis.products_requiring_attention_today > 0 ? 'critical' : 'success'}
          evidenceData={{
            source_tables: ['products', 'inventory', 'sales', 'suppliers'],
            formula: 'Count(products where days_remaining <= lead_time OR current_stock <= reorder_level OR overstock)',
            values_used: {
              low_stock_products: kpis.low_stock_products,
              critical_products: kpis.critical_stock_products,
              overstocked_products: kpis.overstocked_products
            }
          }}
        />

      </div>

      {/* Secondary Quick Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
        <div>
          <span className="text-[11px] text-neutral-400 font-mono uppercase">Total SKUs</span>
          <p className="text-lg font-bold font-mono text-neutral-100 mt-0.5">{kpis.total_products || 0} Active</p>
        </div>
        <div>
          <span className="text-[11px] text-neutral-400 font-mono uppercase">Fast-Moving SKUs</span>
          <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{kpis.fast_moving_products || 0} SKUs</p>
        </div>
        <div>
          <span className="text-[11px] text-neutral-400 font-mono uppercase">Slow-Moving SKUs</span>
          <p className="text-lg font-bold font-mono text-neutral-300 mt-0.5">{kpis.slow_moving_products || 0} SKUs</p>
        </div>
        <div>
          <span className="text-[11px] text-neutral-400 font-mono uppercase">Revenue at Risk</span>
          <p className="text-lg font-bold font-mono text-rose-400 mt-0.5">
            ${data?.priority_summary?.total_revenue_at_risk?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </p>
        </div>
      </div>

      {/* Charts Section: Sales Revenue Trend & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sales Trend Chart (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-100">14-Day Sales & Revenue Velocity</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Real daily revenue and volume transactions</p>
            </div>
            <button
              onClick={() => openEvidence({
                title: "14-Day Sales Velocity Aggregation",
                source_tables: ["sales"],
                date_range: "Past 14 Days",
                formula: "Group by Sale.sale_date -> Sum(total_amount), Sum(quantity_sold)",
                values_used: { data_points: trends.length }
              })}
              className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-emerald-400 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Evidence</span>
            </button>
          </div>

          {trends.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-neutral-400">
              <BarChart className="w-8 h-8 text-neutral-600 mb-2" />
              <p className="text-xs font-medium text-neutral-300">No sales data available for analysis.</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">Import sales records to begin tracking daily and weekly revenue trends.</p>
            </div>
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px', color: '#f4f4f5' }}
                    formatter={(value, name) => [name === 'revenue' ? `$${Number(value).toFixed(2)}` : value, name === 'revenue' ? 'Revenue' : 'Units Sold']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category Contribution (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-neutral-100">Category Revenue</h2>
              <span className="text-xs text-neutral-500 font-mono">30-Day Share</span>
            </div>

            {categories.length === 0 ? (
              <p className="text-xs text-neutral-500 py-8 text-center">No category sales recorded yet.</p>
            ) : (
              <div className="space-y-3.5">
                {categories.map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-200">{cat.category}</span>
                      <span className="font-mono text-neutral-300 font-semibold">${cat.revenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(8, cat.revenue_share_pct || 0))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                      <span>{cat.units} units sold</span>
                      <span>Margin: {cat.gross_margin_pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-neutral-800 text-center">
            <Link to="/sales" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1">
              <span>Deep Sales Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

      {/* Top Urgent Priority Section */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
              <span>Today's Priority Action Items</span>
              <span className="text-xs font-normal text-neutral-400">({priorities.length} ranked items)</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Ranked by stock runway, supplier lead time, velocity, and revenue at risk
            </p>
          </div>
          <Link
            to="/alerts"
            className="text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1"
          >
            <span>View All Ranked Priorities</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {priorities.length === 0 ? (
          <EmptyState
            title="No Priority Alerts"
            description="No priority alerts because there is currently no business data or all inventory is healthy."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-950/60 text-neutral-400 border-b border-neutral-800 font-medium">
                <tr>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Product</th>
                  <th className="py-3 px-3">Current Stock</th>
                  <th className="py-3 px-3">Daily Velocity</th>
                  <th className="py-3 px-3">Runway</th>
                  <th className="py-3 px-3">Revenue at Risk</th>
                  <th className="py-3 px-3">Recommended Action</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {priorities.slice(0, 5).map((item) => (
                  <tr key={item.product_id} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="py-3 px-3">
                      <StatusBadge status={item.priority_level} size="sm" />
                    </td>
                    <td className="py-3 px-3">
                      <Link to={`/products/${item.product_id}`} className="font-semibold text-neutral-200 hover:text-emerald-400 transition-colors">
                        {item.product_name}
                      </Link>
                      <p className="text-[11px] text-neutral-500 font-mono">{item.category} &bull; {item.product_id}</p>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium">
                      <span className={item.current_stock === 0 ? 'text-rose-400 font-bold' : (item.current_stock <= item.reorder_level ? 'text-amber-400' : 'text-neutral-200')}>
                        {item.current_stock} units
                      </span>
                      <span className="text-[10px] text-neutral-500 block">Min: {item.reorder_level}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-300">
                      {item.average_daily_sales} /day
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className={item.days_remaining <= item.lead_time_days ? 'text-rose-400 font-bold' : 'text-neutral-300'}>
                        {item.days_remaining > 900 ? 'No Sales' : `${item.days_remaining} days`}
                      </span>
                      <span className="text-[10px] text-neutral-500 block">Lead: {item.lead_time_days}d</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-neutral-200">
                      {item.revenue_at_risk > 0 ? (
                        <span className="text-rose-400">${item.revenue_at_risk.toFixed(2)}</span>
                      ) : '$0.00'}
                    </td>
                    <td className="py-3 px-3 text-neutral-300 font-medium">
                      {item.recommended_action}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEvidence({
                            title: `Priority Evidence: ${item.product_name}`,
                            ...item.evidence
                          })}
                          className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-emerald-400 transition-colors"
                          title="View mathematical proof"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setRestockModalItem(item);
                            setRestockQty(item.reorder_quantity || 25);
                          }}
                          className="px-2.5 py-1 rounded bg-neutral-100 hover:bg-white text-neutral-950 font-bold text-xs transition-colors flex items-center gap-1"
                        >
                          <Truck className="w-3 h-3" />
                          <span>Reorder</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reorder Modal */}
      <Modal
        isOpen={!!restockModalItem}
        onClose={() => setRestockModalItem(null)}
        title="Execute Purchase Reorder"
      >
        {restockModalItem && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800">
              <p className="text-xs font-semibold text-neutral-200">{restockModalItem.product_name}</p>
              <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                Current Stock: {restockModalItem.current_stock} &bull; Supplier: {restockModalItem.supplier}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1.5">
                Reorder Quantity (Units)
              </label>
              <input
                type="number"
                min="1"
                value={restockQty}
                onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-sm font-mono text-neutral-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-400 space-y-1">
              <div className="flex justify-between">
                <span>Estimated Supplier Delivery:</span>
                <span className="font-mono text-neutral-200">{restockModalItem.lead_time_days} days</span>
              </div>
              <div className="flex justify-between">
                <span>Target Warehouse / Store:</span>
                <span className="font-mono text-neutral-200">{activeStore}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setRestockModalItem(null)}
                className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestock}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Confirm Purchase Order</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
