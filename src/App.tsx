import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { BudgetProvider } from './context/BudgetContext';
import { AuthProvider } from './context/AuthContext';
import { EnvelopeProvider } from './context/EnvelopeContext';
import { SavingsGoalProvider } from './context/SavingsGoalContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import Envelopes from './pages/Envelopes';
import SavingsGoals from './pages/SavingsGoals';
import CashFlowSimulation from './pages/CashFlowSimulation';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/App.css';
import './styles/Navbar.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BudgetProvider>
          <EnvelopeProvider>
            <SavingsGoalProvider>
              <Router>
            <div className="app-container">
              <Navbar />
              <main className="main-content">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* Protected Routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/transactions"
                    element={
                      <ProtectedRoute>
                        <Transactions />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/categories"
                    element={
                      <ProtectedRoute>
                        <Categories />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/envelopes"
                    element={
                      <ProtectedRoute>
                        <Envelopes />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/savings"
                    element={
                      <ProtectedRoute>
                        <SavingsGoals />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/simulation"
                    element={
                      <ProtectedRoute>
                        <CashFlowSimulation />
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </Router>
            </SavingsGoalProvider>
          </EnvelopeProvider>
        </BudgetProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;