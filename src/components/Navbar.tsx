import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatting';

// ── Navigation items with icons ────────────────────────────────────────────
interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/transactions', label: 'Transactions', icon: '💳' },
  { path: '/categories', label: 'Categories', icon: '🏷️' },
  { path: '/envelopes', label: 'Envelopes', icon: '💰' },
  { path: '/savings', label: 'Savings', icon: '🎯' },
  { path: '/scheduled-payments', label: 'Scheduled', icon: '📅' },
  { path: '/simulation', label: 'Simulation', icon: '📈' },
];

// ── Bottom nav shows first 5 items + login/logout state ────────────────────
const bottomNavItems = navItems.slice(0, 5);

const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { state } = useBudget();
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const totalBalance = state.transactions.reduce((total, transaction) => {
    return transaction.type === 'income' ? total + transaction.amount : total - transaction.amount;
  }, 0);

  const monthlyIncome = state.transactions
    .filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const now = new Date();
      return (
        transaction.type === 'income' &&
        transactionDate.getMonth() === now.getMonth() &&
        transactionDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((total, transaction) => total + transaction.amount, 0);

  const monthlyExpenses = state.transactions
    .filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const now = new Date();
      return (
        transaction.type === 'expense' &&
        transactionDate.getMonth() === now.getMonth() &&
        transactionDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((total, transaction) => total + transaction.amount, 0);

  // Hide navbar on auth pages
  if (!isAuthenticated && (location.pathname === '/login' || location.pathname === '/register')) {
    return null;
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* ── Top Navbar ─────────────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-brand" onClick={() => setMobileMenuOpen(false)}>
            <div className="navbar-brand-logo">💰</div>
            <h1>Budget Tracker</h1>
          </Link>

          {/* Desktop nav */}
          <div className="navbar-nav">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop user info */}
          <div className="navbar-right">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {isAuthenticated && user && (
              <div className="navbar-user">
                <span className="user-name">{user.name}</span>
                <button className="btn-logout" onClick={handleLogout}>Logout</button>
              </div>
            )}

            {/* Hamburger (mobile) */}
            {isAuthenticated && (
              <button
                className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                <span /><span /><span />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile Drawer Menu ──────────────────────────────────────────── */}
      {mobileMenuOpen && isAuthenticated && (
        <div className="mobile-menu">
          <div className="navbar-stats" style={{ display: 'flex', padding: '0.5rem 0.75rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
            <div className="stat-item" style={{ flex: 1 }}>
              <span className="stat-label">Balance</span>
              <span className={`stat-value ${totalBalance >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(totalBalance)}
              </span>
            </div>
            <div className="stat-item" style={{ flex: 1 }}>
              <span className="stat-label">Income</span>
              <span className="stat-value positive">{formatCurrency(monthlyIncome)}</span>
            </div>
            <div className="stat-item" style={{ flex: 1 }}>
              <span className="stat-label">Expenses</span>
              <span className="stat-value negative">{formatCurrency(monthlyExpenses)}</span>
            </div>
          </div>

          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {user && (
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Signed in as <strong>{user.name}</strong>
              </div>
              <button className="btn btn-danger btn-sm btn-block" onClick={handleLogout}>
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Bottom Tab Bar (mobile) ─────────────────────────────────────── */}
      {isAuthenticated && (
        <div className="bottom-nav">
          <div className="bottom-nav-inner">
            {bottomNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`bottom-nav-link ${isActive(item.path) ? 'active' : ''}`}
              >
                <span className="bottom-nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;