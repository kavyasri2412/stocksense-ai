import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Box, 
  DollarSign, 
  Truck, 
  TrendingUp, 
  Calendar, 
  ShieldCheck, 
  Sliders, 
  Package, 
  Clock, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function ProductDetailPage() {
  const { productId } = useParams();
  const { openEvidence } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quick Restock State
  const [restockQty, setRestockQty] = useState(25);
  const [restockSuccess, setRestockSuccess] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getProductDetails(productId);
      setData(res);
    } catch (err) {
      setError(err.message || 'Product not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [productId]);

  const handleRestock = async () => {
    try {
      await api.restockProduct(productId, restockQty, 'Downtown Flagship');
      setRestockSuccess(true);
      fetchDetails();
      setTimeout(() => setRestockSuccess(false), 4000);
    } catch (err) {
      alert(`Restock failed: ${err.message}`);
    }
  };

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <LoadingSpinner text={`Retrieving details for SKU ${productId}...`} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <EmptyState
          title="Product Not Found"
          description={`SKU '${productId}' does not exist or has been archived.`}
          actionLabel="Return to Inventory"
          actionLink="/inventory"
        />
      </div>
    );
  }

  const p = data.product || {};
  const inv = data.inventory || {};
  const v7 = data.velocities?.['7d'] || {};
  const v30 = data.velocities?.['30d'] || {};
  const v90 = data.velocities?.['90d'] || {};
  const sim = data.runway_simulation?.baseline || {};
  const recentSales = data.recent_sales || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Back Button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <Link
            to="/inventory"
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">{p.product_name}</h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                {p.product_id}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Category: <span className="text-neutral-200 font-medium">{p.category}</span> &bull; Supplier: <span className="text-neutral-200 font-medium">{p.supplier}</span> ({p.lead_time_days} days lead)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openEvidence({
              title: `SKU Audit: ${p.product_name}`,
              source_tables: ['products', 'inventory', 'sales', 'suppliers'],
              formula: 'Runway = CurrentStock / 30D ADS; Reorder Urgency = DaysRemaining vs SupplierLeadTime',
              values_used: {
                current_stock: inv.total_stock,
                selling_price: p.selling_price,
                cost_price: p.cost_price,
                ads_30d: v30.average_daily_sales,
                lead_time_days: p.lead_time_days,
                projected_runway_days: sim.coverage_days
              }
            })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Audit Evidence</span>
          </button>

          <Link
            to="/simulator"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-white text-neutral-950 font-bold text-xs transition-all shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Simulate Scenarios</span>
          </Link>
        </div>
      </div>

      {restockSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Successfully restocked {restockQty} units!</span>
        </div>
      )}

      {/* Product Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Current Stock Holding</span>
          <p className="text-2xl font-bold font-mono text-neutral-100 mt-1">
            {inv.total_stock || 0} <span className="text-xs font-normal text-neutral-400">units</span>
          </p>
          <span className="text-[11px] text-neutral-500 font-mono block">
            Reorder Min: {p.reorder_level} &bull; Target Qty: {p.reorder_quantity}
          </span>
        </div>

        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Estimated Runway</span>
          <p className="text-2xl font-bold font-mono text-neutral-100 mt-1">
            {sim.coverage_days > 900 ? 'No Sales' : `${sim.coverage_days} days`}
          </p>
          <span className="text-[11px] text-neutral-500 font-mono block">
            Supplier Delivery Lead: {p.lead_time_days} days
          </span>
        </div>

        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Unit Economics</span>
          <p className="text-2xl font-bold font-mono text-neutral-100 mt-1">
            ${p.selling_price?.toFixed(2)}
          </p>
          <span className="text-[11px] text-emerald-400 font-mono block">
            Cost: ${p.cost_price?.toFixed(2) || '0.00'} &bull; Margin: {(((p.selling_price - (p.cost_price || 0)) / p.selling_price) * 100).toFixed(1)}%
          </span>
        </div>

        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">30-Day Sales Volume</span>
          <p className="text-2xl font-bold font-mono text-neutral-100 mt-1">
            {v30.total_units_sold || 0} <span className="text-xs font-normal text-neutral-400">units</span>
          </p>
          <span className="text-[11px] text-neutral-500 font-mono block">
            Realized Revenue: ${v30.total_revenue?.toFixed(2) || '0.00'}
          </span>
        </div>

      </div>

      {/* Sales Velocity Comparison & Quick Reorder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Multi-Window Velocity Breakdown (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-5">
          <h3 className="text-sm font-semibold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Multi-Horizon Velocity Analysis</span>
          </h3>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-400 font-mono uppercase">7-Day Window</span>
              <p className="text-lg font-bold font-mono text-neutral-100">{v7.average_daily_sales || 0} /day</p>
              <span className="text-[10px] text-neutral-500 block">{v7.total_units_sold || 0} units total</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-400 font-mono uppercase">30-Day Window</span>
              <p className="text-lg font-bold font-mono text-emerald-400">{v30.average_daily_sales || 0} /day</p>
              <span className="text-[10px] text-neutral-500 block">{v30.total_units_sold || 0} units total</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-400 font-mono uppercase">90-Day Window</span>
              <p className="text-lg font-bold font-mono text-neutral-100">{v90.average_daily_sales || 0} /day</p>
              <span className="text-[10px] text-neutral-500 block">{v90.total_units_sold || 0} units total</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-400 leading-relaxed">
            <span className="font-semibold text-neutral-200">Velocity Shift Insight: </span>
            {v7.average_daily_sales > v30.average_daily_sales * 1.3 ? (
              <span className="text-emerald-400">Demand has surged in the recent 7 days compared to 30-day baseline.</span>
            ) : v7.average_daily_sales < v30.average_daily_sales * 0.7 ? (
              <span className="text-rose-400">Sales velocity is dropping below monthly average.</span>
            ) : (
              <span>Demand velocity is consistent and stable across rolling windows.</span>
            )}
          </div>
        </div>

        {/* Right: Quick Purchase Order Restock Card (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>Direct Restock Purchase</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Issue immediate replenishment order to <strong>{p.supplier}</strong>.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1">
                  Reorder Batch Size (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-neutral-950 text-xs text-neutral-400 space-y-1">
                <div className="flex justify-between">
                  <span>Estimated Cost:</span>
                  <span className="font-mono text-neutral-200 font-semibold">${(restockQty * (p.cost_price || (p.selling_price * 0.6))).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lead Time:</span>
                  <span className="font-mono text-neutral-200">{p.lead_time_days} days</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRestock}
            className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 font-bold text-xs transition-all shadow-md mt-4"
          >
            Execute Purchase Order
          </button>
        </div>

      </div>

      {/* Recent Sales Transactions for this SKU */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-100">Recent Customer Transactions for this SKU</h3>
        
        {recentSales.length === 0 ? (
          <p className="text-xs text-neutral-500 py-4 text-center">No recent transaction logs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Transaction ID</th>
                  <th className="py-2.5 px-3">Sale Date</th>
                  <th className="py-2.5 px-3">Store Location</th>
                  <th className="py-2.5 px-3">Quantity Sold</th>
                  <th className="py-2.5 px-3">Selling Price</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-mono">
                {recentSales.map((tx) => (
                  <tr key={tx.sale_id} className="hover:bg-neutral-800/30">
                    <td className="py-2.5 px-3 text-neutral-400">{tx.sale_id}</td>
                    <td className="py-2.5 px-3 text-neutral-300">{tx.sale_date}</td>
                    <td className="py-2.5 px-3 text-neutral-300 font-sans">{tx.store_name}</td>
                    <td className="py-2.5 px-3 text-neutral-100 font-bold">{tx.quantity_sold}</td>
                    <td className="py-2.5 px-3 text-neutral-300">${tx.selling_price?.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">${tx.total_amount?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
