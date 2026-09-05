import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  AlertCircle, 
  ShieldCheck, 
  DollarSign, 
  Clock, 
  Truck, 
  RefreshCw, 
  PackageX, 
  Layers, 
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function AlertsPage() {
  const { activeStore, openEvidence } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('priorities'); // priorities, revenue_risk, alerts, data_quality

  const [restockModalItem, setRestockModalItem] = useState(null);
  const [restockQty, setRestockQty] = useState(25);
  const [notification, setNotification] = useState(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const storeParam = activeStore === 'All Stores' ? null : activeStore;
      const res = await api.getAlerts(storeParam);
      setData(res);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [activeStore]);

  const handleRestock = async () => {
    if (!restockModalItem) return;
    try {
      await api.restockProduct(restockModalItem.product_id, restockQty, activeStore);
      setNotification(`Restocked ${restockQty} units for ${restockModalItem.product_name}!`);
      setRestockModalItem(null);
      fetchAlerts();
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      alert(`Restock failed: ${err.message}`);
    }
  };

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <LoadingSpinner text="Executing deterministic alert and priority algorithms..." />
      </div>
    );
  }

  const priorities = data?.todays_priorities || [];
  const revenueRisk = data?.revenue_at_risk || [];
  const alertsList = data?.alerts || [];
  const qualityIssues = data?.data_quality_issues || [];
  const totalRisk = data?.total_revenue_at_risk || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">Alerts & Priority Engine</h1>
            <span className="px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-800/60 text-[11px] font-mono text-rose-300">
              Deterministic Logic
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Prioritizing stock-out risks, capital bottlenecks, and financial exposure across {activeStore}
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Financial Exposure Banner */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="space-y-1 md:border-r border-neutral-800 md:pr-6">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Total Revenue at Immediate Risk</span>
          <p className="text-3xl font-extrabold font-mono text-rose-400">
            ${totalRisk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-neutral-500">
            Formula: &sum; (LeadTimeShortage &times; SellingPrice)
          </p>
        </div>

        <div className="space-y-1 md:border-r border-neutral-800 md:pr-6">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Today's Priority Items</span>
          <p className="text-3xl font-extrabold font-mono text-neutral-100">
            {priorities.length} SKUs
          </p>
          <p className="text-[11px] text-neutral-500">
            {priorities.filter(p => p.priority_level === 'Critical').length} Critical &bull; {priorities.filter(p => p.priority_level === 'High').length} High Priority
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Active Alert Signals</span>
          <p className="text-3xl font-extrabold font-mono text-amber-400">
            {alertsList.length} Signals
          </p>
          <p className="text-[11px] text-neutral-500">
            Categorized across Stock-out, Low stock & Overstock
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 gap-6 text-xs font-medium">
        {[
          { id: 'priorities', label: "Today's Priorities", count: priorities.length },
          { id: 'revenue_risk', label: 'Revenue at Risk Matrix', count: revenueRisk.length },
          { id: 'alerts', label: 'Rule-Based Alerts', count: alertsList.length },
          { id: 'data_quality', label: 'Data Quality Warnings', count: qualityIssues.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>{tab.label}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-[10px] text-neutral-300 font-mono">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab 1: Today's Priorities */}
      {activeTab === 'priorities' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-400 leading-relaxed">
              <strong>Priority Ranking Engine:</strong> Deterministically aggregates urgency (days remaining vs supplier lead time), sales velocity, and financial impact. Items with highest potential revenue loss and shortest runway are elevated to the top.
            </div>
          </div>

          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 font-medium">
                  <tr>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Current Stock</th>
                    <th className="py-3 px-4">Daily Sales (ADS)</th>
                    <th className="py-3 px-4">Runway Days</th>
                    <th className="py-3 px-4">Supplier & Lead</th>
                    <th className="py-3 px-4">Reason & Evidence</th>
                    <th className="py-3 px-4">Recommended Action</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {priorities.map((item) => (
                    <tr key={item.product_id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <StatusBadge status={item.priority_level} size="sm" />
                        <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">Score: {item.priority_score}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Link to={`/products/${item.product_id}`} className="font-semibold text-neutral-200 hover:text-emerald-400 transition-colors">
                          {item.product_name}
                        </Link>
                        <p className="text-[11px] text-neutral-500 font-mono">{item.category} &bull; {item.product_id}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium">
                        <span className={item.current_stock === 0 ? 'text-rose-400 font-bold' : (item.current_stock <= item.reorder_level ? 'text-amber-400' : 'text-neutral-200')}>
                          {item.current_stock} units
                        </span>
                        <span className="text-[10px] text-neutral-500 block">Min: {item.reorder_level}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-300">
                        {item.average_daily_sales} /day
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className={item.days_remaining <= item.lead_time_days ? 'text-rose-400 font-bold' : 'text-neutral-300'}>
                          {item.days_remaining > 900 ? 'No Sales' : `${item.days_remaining}d`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-400 text-[11px]">
                        <span className="text-neutral-200 font-medium block truncate max-w-[130px]">{item.supplier}</span>
                        <span>Lead: {item.lead_time_days} days</span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-300 max-w-xs">
                        <p className="line-clamp-2">{item.reason}</p>
                        {item.revenue_at_risk > 0 && (
                          <span className="text-rose-400 font-mono font-semibold text-[11px] block mt-0.5">
                            Risk: ${item.revenue_at_risk.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-200 font-semibold">
                        {item.recommended_action}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEvidence({
                              title: `Priority Evidence: ${item.product_name}`,
                              ...item.evidence
                            })}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-emerald-400 transition-colors"
                            title="Audit formula and provenance"
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
          </div>
        </div>
      )}

      {/* Tab 2: Revenue at Risk */}
      {activeTab === 'revenue_risk' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-400 leading-relaxed">
              <strong>Revenue at Risk Calculation:</strong> Quantifies unfulfilled consumer demand during supplier lead time replenishment.
              <span className="font-mono text-emerald-400 block mt-1">Shortage = max(0, (ADS &times; SupplierLeadTime) - CurrentStock); RevenueAtRisk = Shortage &times; SellingPrice</span>
            </div>
          </div>

          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 font-medium">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Current Stock</th>
                    <th className="py-3 px-4">Lead Time</th>
                    <th className="py-3 px-4">Expected Demand</th>
                    <th className="py-3 px-4">Estimated Shortage</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4">Revenue at Risk</th>
                    <th className="py-3 px-4">Recommended Action</th>
                    <th className="py-3 px-4 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {revenueRisk.map((item) => (
                    <tr key={item.product_id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-neutral-200">
                        {item.product_name}
                        <span className="text-[11px] text-neutral-500 font-mono block">{item.category}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-neutral-300">{item.current_stock} units</td>
                      <td className="py-3.5 px-4 font-mono text-neutral-300">{item.lead_time_days} days</td>
                      <td className="py-3.5 px-4 font-mono text-neutral-300">{item.expected_demand_during_lead_time} units</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-400">{item.estimated_shortage} units</td>
                      <td className="py-3.5 px-4 font-mono text-neutral-200">${item.selling_price?.toFixed(2)}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-400 text-sm">
                        ${item.revenue_at_risk?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-neutral-200">{item.recommended_action}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openEvidence({
                            title: `Revenue at Risk Proof: ${item.product_name}`,
                            ...item.evidence
                          })}
                          className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-emerald-400 transition-colors"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Rule-Based Alerts */}
      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alertsList.map((alt) => (
            <div 
              key={alt.alert_id} 
              className={`p-5 rounded-2xl border transition-all ${
                alt.severity === 'Critical' ? 'bg-rose-950/20 border-rose-900/40' :
                alt.severity === 'Warning' ? 'bg-amber-950/20 border-amber-900/40' :
                'bg-neutral-900 border-neutral-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    alt.severity === 'Critical' ? 'bg-rose-500' :
                    alt.severity === 'Warning' ? 'bg-amber-500' : 'bg-zinc-400'
                  }`} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">{alt.alert_type}</span>
                </div>
                <span className="text-xs font-mono text-neutral-400">{alt.metric_value}</span>
              </div>

              <h4 className="text-sm font-bold text-neutral-100 mt-2">{alt.product_name}</h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{alt.message}</p>

              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-medium">{alt.action}</span>
                {alt.reorder_quantity > 0 && (
                  <button
                    onClick={() => {
                      setRestockModalItem({ product_id: alt.product_id, product_name: alt.product_name, lead_time_days: 7 });
                      setRestockQty(alt.reorder_quantity);
                    }}
                    className="px-2.5 py-1 rounded bg-neutral-100 text-neutral-950 font-bold text-xs hover:bg-white transition-colors"
                  >
                    Reorder {alt.reorder_quantity} Units
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Data Quality Warnings */}
      {activeTab === 'data_quality' && (
        <div className="space-y-4">
          {qualityIssues.length === 0 ? (
            <EmptyState
              title="100% Data Integrity Verified"
              description="No missing prices, missing supplier links, or orphan records detected."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {qualityIssues.map((issue) => (
                <div key={issue.product_id} className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-200">{issue.product_name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/50">
                      {issue.severity}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">{issue.reason}</p>
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {issue.missing_fields.map((f) => (
                      <span key={f} className="px-2 py-0.5 rounded bg-neutral-950 text-[10px] font-mono text-neutral-400 border border-neutral-800">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Restock Modal */}
      <Modal
        isOpen={!!restockModalItem}
        onClose={() => setRestockModalItem(null)}
        title="Execute Purchase Reorder"
      >
        {restockModalItem && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
              <p className="text-xs font-semibold text-neutral-200">{restockModalItem.product_name}</p>
              <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                Target Store: {activeStore}
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
                onClick={handleRestock}
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
