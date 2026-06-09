import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatting';

const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { state } = useBudget();
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
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

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/categories', label: 'Categories' },
    { path: '/envelopes', label: 'Envelopes' },
    { path: '/savings', label: 'Savings Goals' },
  ];

  // Hide navbar on auth pages
  if (!isAuthenticated && (location.pathname === '/login' || location.pathname === '/register')) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>Budget Tracker</h1>
        </div>
        
        {isAuthenticated && (
          <>
            <div className="navbar-nav">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="navbar-stats">
              <div className="stat-item">
                <span className="stat-label">Balance</span>
                <span className={`stat-value ${totalBalance >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(totalBalance)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Income</span>
                <span className="stat-value positive">
                  {formatCurrency(monthlyIncome)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Expenses</span>
                <span className="stat-value negative">
                  {formatCurrency(monthlyExpenses)}
                </span>
              </div>
            </div>
          </>
        )}

        <div className="navbar-right">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {isAuthenticated && user && (
            <div className="navbar-user">
              <span className="user-name">{user.name}</span>
              <button className="btn btn-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;