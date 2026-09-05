import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Plus, 
  Truck, 
  SlidersHorizontal, 
  ShieldCheck, 
  ArrowUpDown, 
  AlertTriangle, 
  CheckCircle, 
  Package, 
  RefreshCw,
  Edit2,
  ExternalLink
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function InventoryPage() {
  const { activeStore, openEvidence } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('urgency');

  // Modals
  const [restockModalItem, setRestockModalItem] = useState(null);
  const [restockQty, setRestockQty] = useState(25);
  const [adjustModalItem, setAdjustModalItem] = useState(null);
  const [adjustStockVal, setAdjustStockVal] = useState(0);
  const [createProductOpen, setCreateProductOpen] = useState(false);

  // New Product Form State
  const [newProd, setNewProd] = useState({
    product_id: '',
    product_name: '',
    category: 'Electronics',
    selling_price: '',
    cost_price: '',
    reorder_level: 10,
    reorder_quantity: 25,
    initial_stock: 20
  });

  const [notification, setNotification] = useState(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const storeParam = activeStore === 'All Stores' ? null : activeStore;
      const res = await api.getInventory({
        search: search || undefined,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        store: storeParam || undefined,
        sort_by: sortBy
      });
      setItems(res.inventory || []);

      // Extract distinct categories
      const distinctCats = Array.from(new Set((res.inventory || []).map(i => i.category)));
      setCategories(['All', ...distinctCats]);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [activeStore, categoryFilter, statusFilter, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInventory();
  };

  const handleRestock = async () => {
    if (!restockModalItem) return;
    try {
      await api.restockProduct(restockModalItem.product_id, restockQty, activeStore);
      setNotification(`Restocked ${restockQty} units for ${restockModalItem.product_name}!`);
      setRestockModalItem(null);
      fetchInventory();
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      alert(`Restock failed: ${err.message}`);
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustModalItem) return;
    try {
      await api.adjustStock(adjustModalItem.product_id, adjustStockVal);
      setNotification(`Adjusted stock for ${adjustModalItem.product_name} to ${adjustStockVal} units.`);
      setAdjustModalItem(null);
      fetchInventory();
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      alert(`Stock adjustment failed: ${err.message}`);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await api.createProduct({
        ...newProd,
        selling_price: parseFloat(newProd.selling_price),
        cost_price: parseFloat(newProd.cost_price || newProd.selling_price * 0.6),
        reorder_level: parseInt(newProd.reorder_level),
        reorder_quantity: parseInt(newProd.reorder_quantity),
        initial_stock: parseInt(newProd.initial_stock),
        store_name: activeStore === 'All Stores' ? 'Downtown Flagship' : activeStore
      });
      setNotification(`Product '${newProd.product_name}' created successfully!`);
      setCreateProductOpen(false);
      setNewProd({
        product_id: '',
        product_name: '',
        category: 'Electronics',
        selling_price: '',
        cost_price: '',
        reorder_level: 10,
        reorder_quantity: 25,
        initial_stock: 20
      });
      fetchInventory();
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      alert(`Failed to create product: ${err.message}`);
    }
  };

  // Status Summary Counts
  const criticalCount = items.filter(i => i.stock_status === 'Critical').length;
  const lowStockCount = items.filter(i => i.stock_status === 'Low stock').length;
  const healthyCount = items.filter(i => i.stock_status === 'Healthy').length;
  const overstockCount = items.filter(i => i.stock_status === 'Overstock').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">Inventory Management</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Tracking {items.length} active SKUs across {activeStore} &bull; Deterministic runway calculations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchInventory}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
            title="Refresh Inventory Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCreateProductOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-100 hover:bg-white text-neutral-950 font-bold text-xs shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Quick Filter Status Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'All Items', value: 'All', count: items.length },
          { label: 'Critical (0 Stock)', value: 'Critical', count: criticalCount, color: 'text-rose-400' },
          { label: 'Low Stock', value: 'Low stock', count: lowStockCount, color: 'text-amber-400' },
          { label: 'Healthy', value: 'Healthy', count: healthyCount, color: 'text-emerald-400' },
          { label: 'Overstock', value: 'Overstock', count: overstockCount, color: 'text-zinc-300' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`p-3 rounded-xl border text-left transition-all ${
              statusFilter === tab.value 
                ? 'bg-neutral-800 border-neutral-600 shadow-sm' 
                : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <span className="text-[11px] text-neutral-400 block">{tab.label}</span>
            <span className={`text-lg font-bold font-mono ${tab.color || 'text-neutral-100'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, product name..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </form>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          {/* Category */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="urgency">Urgency Priority</option>
              <option value="stock_asc">Lowest Stock First</option>
              <option value="stock_desc">Highest Stock First</option>
              <option value="value_desc">Highest Inventory Value</option>
              <option value="name_asc">Product Name (A-Z)</option>
            </select>
          </div>

        </div>

      </div>

      {/* Inventory Table */}
      {loading ? (
        <LoadingSpinner text="Retrieving verified stock records..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="No Products Match Filters"
          description="Try clearing your category or status filters to view full inventory records."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearch('');
            setCategoryFilter('All');
            setStatusFilter('All');
          }}
        />
      ) : (
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 font-medium">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">Stock Level</th>
                  <th className="py-3 px-4">Velocity (ADS)</th>
                  <th className="py-3 px-4">Est. Runway</th>
                  <th className="py-3 px-4">Inventory Value</th>
                  <th className="py-3 px-4">Supplier & Lead</th>
                  <th className="py-3 px-4">Recommended Action</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {items.map((item) => (
                  <tr key={item.product_id} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <StatusBadge status={item.stock_status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <Link 
                        to={`/products/${item.product_id}`}
                        className="font-semibold text-neutral-200 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                      >
                        <span>{item.product_name}</span>
                        <ExternalLink className="w-3 h-3 text-neutral-500" />
                      </Link>
                      <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                        {item.category} &bull; SKU: {item.product_id} &bull; ${item.selling_price?.toFixed(2)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className={`font-semibold ${
                        item.current_stock === 0 ? 'text-rose-400' :
                        item.current_stock <= item.reorder_level ? 'text-amber-400' : 'text-neutral-200'
                      }`}>
                        {item.current_stock} units
                      </span>
                      <span className="text-[10px] text-neutral-500 block">
                        Reorder Min: {item.reorder_level}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-300">
                      {item.average_daily_sales} /day
                      <span className="text-[10px] text-neutral-500 block">{item.units_sold_30d} sold (30d)</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className={`font-semibold ${
                        item.estimated_days_remaining <= item.lead_time_days ? 'text-rose-400' : 'text-neutral-300'
                      }`}>
                        {item.estimated_days_remaining > 900 ? 'No Sales Data' : `${item.estimated_days_remaining} days`}
                      </span>
                      <span className="text-[10px] text-neutral-500 block">Lead: {item.lead_time_days} days</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-300">
                      <span>${item.inventory_cost_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-[10px] text-neutral-500 block">Retail: ${item.inventory_retail_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-400 text-[11px]">
                      <span className="text-neutral-200 font-medium block truncate max-w-[140px]">{item.supplier}</span>
                      <span>Lead: {item.lead_time_days}d</span>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-300 font-medium">
                      {item.recommended_action}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEvidence({
                            title: `Inventory Audit: ${item.product_name}`,
                            source_tables: ['products', 'inventory', 'sales', 'suppliers'],
                            formula: 'DaysRemaining = CurrentStock / ADS; Status determined by LeadTime and ReorderThreshold',
                            values_used: {
                              current_stock: item.current_stock,
                              reorder_level: item.reorder_level,
                              average_daily_sales_30d: item.average_daily_sales,
                              lead_time_days: item.lead_time_days,
                              estimated_runway_days: item.estimated_days_remaining
                            }
                          })}
                          className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-emerald-400 transition-colors"
                          title="Audit mathematical formula"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setAdjustModalItem(item);
                            setAdjustStockVal(item.current_stock);
                          }}
                          className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors"
                          title="Reconcile / Adjust Stock"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
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
      )}

      {/* Restock Purchase Order Modal */}
      <Modal
        isOpen={!!restockModalItem}
        onClose={() => setRestockModalItem(null)}
        title="Execute Purchase Order (Restock)"
      >
        {restockModalItem && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
              <p className="text-xs font-semibold text-neutral-200">{restockModalItem.product_name}</p>
              <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                Current Stock: {restockModalItem.current_stock} &bull; Supplier: {restockModalItem.supplier} ({restockModalItem.lead_time_days} days lead)
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

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={!!adjustModalItem}
        onClose={() => setAdjustModalItem(null)}
        title="Physical Inventory Reconciliation"
      >
        {adjustModalItem && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
              <p className="text-xs font-semibold text-neutral-200">{adjustModalItem.product_name}</p>
              <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                Current Recorded Stock: {adjustModalItem.current_stock} units
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1.5">
                Actual Physical Stock Count (Units)
              </label>
              <input
                type="number"
                min="0"
                value={adjustStockVal}
                onChange={(e) => setAdjustStockVal(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-sm font-mono text-neutral-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setAdjustModalItem(null)}
                className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdjustStock}
                className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-white text-neutral-950 font-bold text-xs"
              >
                Save Adjustment
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add New Product Modal */}
      <Modal
        isOpen={createProductOpen}
        onClose={() => setCreateProductOpen(false)}
        title="Add New Retail Product SKU"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1">Product SKU / ID *</label>
              <input
                type="text"
                required
                value={newProd.product_id}
                onChange={(e) => setNewProd({ ...newProd, product_id: e.target.value })}
                placeholder="e.g. PRD-501"
                className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1">Category *</label>
              <input
                type="text"
                required
                value={newProd.category}
                onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                placeholder="Electronics, Apparel..."
                className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1">Product Title *</label>
            <input
              type="text"
              required
              value={newProd.product_name}
              onChange={(e) => setNewProd({ ...newProd, product_name: e.target.value })}
              placeholder="e.g. Ergonomic Bluetooth Mouse"
              className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1">Selling Price ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={newProd.selling_price}
                onChange={(e) => setNewProd({ ...newProd, selling_price: e.target.value })}
                placeholder="49.99"
                className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1">Cost Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={newProd.cost_price}
                onChange={(e) => setNewProd({ ...newProd, cost_price: e.target.value })}
                placeholder="22.50"
                className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1">Reorder Level</label>
              <input
                type="number"
                value={newProd.reorder_level}
                onChange={(e) => setNewProd({ ...newProd, reorder_level: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1">Reorder Qty</label>
              <input
                type="number"
                value={newProd.reorder_quantity}
                onChange={(e) => setNewProd({ ...newProd, reorder_quantity: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1">Initial Stock</label>
              <input
                type="number"
                value={newProd.initial_stock}
                onChange={(e) => setNewProd({ ...newProd, initial_stock: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setCreateProductOpen(false)}
              className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs"
            >
              Create Product SKU
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
