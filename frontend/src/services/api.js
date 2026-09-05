// Centralized API client for StockSense AI

const API_BASE = '/api';

async function fetchJson(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Health & Auth
  getHealth: () => fetchJson('/health'),
  login: (email, password, role) => fetchJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, role })
  }),
  getUsers: () => fetchJson('/auth/users'),

  // Dashboard
  getDashboardSummary: (storeId) => fetchJson(`/dashboard/summary${storeId ? `?store_id=${storeId}` : ''}`),

  // Products
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/products${query ? `?${query}` : ''}`);
  },
  getProductDetails: (id) => fetchJson(`/products/${id}`),
  createProduct: (data) => fetchJson('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => fetchJson(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => fetchJson(`/products/${id}`, { method: 'DELETE' }),

  // Inventory
  getInventory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/inventory${query ? `?${query}` : ''}`);
  },
  restockProduct: (productId, quantity, warehouseOrStore) => fetchJson('/inventory/restock', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity, warehouse_or_store: warehouseOrStore })
  }),
  adjustStock: (productId, currentStock) => fetchJson('/inventory/adjust', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, current_stock: currentStock })
  }),

  // Sales Analytics
  getSalesAnalytics: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/sales/analytics${query ? `?${query}` : ''}`);
  },

  // Alerts & Priorities
  getAlerts: (storeId) => fetchJson(`/alerts${storeId ? `?store_id=${storeId}` : ''}`),
  getPriorities: (storeId) => fetchJson(`/alerts/priorities${storeId ? `?store_id=${storeId}` : ''}`),
  getRevenueAtRisk: (storeId) => fetchJson(`/alerts/revenue-at-risk${storeId ? `?store_id=${storeId}` : ''}`),

  // What-If Simulator
  runSimulation: (params) => fetchJson('/simulator/run', {
    method: 'POST',
    body: JSON.stringify(params)
  }),

  // AI Copilot
  askCopilot: (query, storeId) => fetchJson('/copilot/chat', {
    method: 'POST',
    body: JSON.stringify({ query, store_id: storeId })
  }),
  getCopilotHistory: () => fetchJson('/copilot/history'),
  clearCopilotHistory: () => fetchJson('/copilot/history', { method: 'DELETE' }),

  // Data Management
  getDbStatus: () => fetchJson('/data/db-status'),
  getDataQualityReport: () => fetchJson('/data/quality-report'),
  seedSampleData: () => fetchJson('/data/seed-sample', { method: 'POST' }),
  purgeData: () => fetchJson('/data/purge', { method: 'POST' }),
  
  importFile: async (formData) => {
    const res = await fetch(`${API_BASE}/data/import`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || (data.errors && data.errors[0]) || 'Import failed');
    return data;
  }
};
