import { BrowserRouter, Routes, Route } from 'react-router-dom';
import React from 'react';
import MainLayout from './layouts/MainLayout';
import { AuthProvider } from './components/AuthContext'; // Import AuthProvider

// Import actual page components
import DashboardPage from './pages/DashboardPage';
import AddTransactionPage from './pages/AddTransactionPage';
import AiQueryPage from './pages/AiQueryPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import TransactionsPage from './pages/TransactionsPage';

function AppRouter() {
  return (
    <AuthProvider> {/* Wrap BrowserRouter with AuthProvider */}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="add-transaction" element={<AddTransactionPage />} />
          <Route path="ai-query" element={<AiQueryPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}

export default AppRouter;
