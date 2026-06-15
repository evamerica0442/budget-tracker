import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { BudgetProvider } from './context/BudgetContext';
import { AuthProvider } from './context/AuthContext';
import { EnvelopeProvider } from './context/EnvelopeContext';
import { SavingsGoalProvider } from './context/SavingsGoalContext';
import Sidebar from './components/Sidebar';
import FloatingActionButton from './components/FloatingActionButton';
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
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Protected Routes */}
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

// ── Bottom Navigation Bar ───────────────────────────────────────────────────
const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bottom-nav">
      <button
        className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="8" height="8" rx="2" />
          <rect x="12" y="2" width="8" height="8" rx="2" />
          <rect x="2" y="12" width="8" height="8" rx="2" />
          <rect x="12" y="12" width="8" height="8" rx="2" />
        </svg>
        <span>Home</span>
      </button>
      <button
        className={`bottom-nav-item ${isActive('/transactions') ? 'active' : ''}`}
        onClick={() => navigate('/transactions')}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="18" height="16" rx="2" />
          <line x1="2" y1="9" x2="20" y2="9" />
          <line x1="6" y1="13" x2="16" y2="13" />
        </svg>
        <span>Expenses</span>
      </button>
      <button
        className={`bottom-nav-item ${isActive('/categories') ? 'active' : ''}`}
        onClick={() => navigate('/categories')}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2,17 8,11 12,14 20,5" />
          <polyline points="16,5 20,5 20,9" />
        </svg>
        <span>Reports</span>
      </button>
      <button
        className={`bottom-nav-item ${isActive('/scheduled-payments') ? 'active' : ''}`}
        onClick={() => navigate('/scheduled-payments')}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="9" />
          <path d="M11 6v5l4 2" />
        </svg>
        <span>Schedule</span>
      </button>
    </nav>
  );
};

const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

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
      <BottomNav />
      <FloatingActionButton
        onClick={() => navigate('/transactions')}
        label="Add Expense"
      />
    </div>
  );
};

export default App;