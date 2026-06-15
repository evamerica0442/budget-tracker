import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { BudgetProvider } from './context/BudgetContext';
import { AuthProvider } from './context/AuthContext';
import { EnvelopeProvider } from './context/EnvelopeContext';
import { SavingsGoalProvider } from './context/SavingsGoalContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import Envelopes from './pages/Envelopes';
import SavingsGoals from './pages/SavingsGoals';
import CashFlowSimulation from './pages/CashFlowSimulation';
import ScheduledPayments from './pages/ScheduledPayments';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/App.css';
import './styles/Sidebar.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BudgetProvider>
          <EnvelopeProvider>
            <SavingsGoalProvider>
              <Router>
                <Routes>
                  {/* Public Routes — no sidebar */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Protected Routes — with sidebar layout */}
                  <Route path="/*" element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  } />
                </Routes>
              </Router>
            </SavingsGoalProvider>
          </EnvelopeProvider>
        </BudgetProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/envelopes" element={<Envelopes />} />
          <Route path="/savings" element={<SavingsGoals />} />
          <Route path="/scheduled-payments" element={<ScheduledPayments />} />
          <Route path="/simulation" element={<CashFlowSimulation />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;