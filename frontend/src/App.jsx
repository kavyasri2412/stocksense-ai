import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import EvidenceDrawer from './components/common/EvidenceDrawer';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import SalesAnalyticsPage from './pages/SalesAnalyticsPage';
import AlertsPage from './pages/AlertsPage';
import CopilotPage from './pages/CopilotPage';
import SimulatorPage from './pages/SimulatorPage';
import DataManagementPage from './pages/DataManagementPage';
import SettingsPage from './pages/SettingsPage';
import ProductDetailPage from './pages/ProductDetailPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-neutral-800 selection:text-white">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/sales" element={<SalesAnalyticsPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/copilot" element={<CopilotPage />} />
              <Route path="/simulator" element={<SimulatorPage />} />
              <Route path="/data-management" element={<DataManagementPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/products/:productId" element={<ProductDetailPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <EvidenceDrawer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
