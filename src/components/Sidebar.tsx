import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// ── SVG Icon Components ───────────────────────────────────────────────────
const IconDashboard = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="7" height="7" rx="1.5" />
    <rect x="11" y="2" width="7" height="7" rx="1.5" />
    <rect x="2" y="11" width="7" height="7" rx="1.5" />
    <rect x="11" y="11" width="7" height="7" rx="1.5" />
  </svg>
);

const IconTransactions = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="16" height="14" rx="2" />
    <line x1="2" y1="8" x2="18" y2="8" />
    <line x1="6" y1="12" x2="14" y2="12" />
  </svg>
);

const IconSpending = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="8" />
    <path d="M10 6v4l3 2" />
    <circle cx="10" cy="10" r="2" />
  </svg>
);

const IconInvestment = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2,16 7,10 11,13 18,5" />
    <polyline points="14,5 18,5 18,9" />
  </svg>
);

const IconPlanning = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h12v14l-3-2-3 2-3-2-3 2V4z" />
    <line x1="7" y1="8" x2="13" y2="8" />
    <line x1="7" y1="11" x2="11" y2="11" />
  </svg>
);

const IconManagement = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="3" />
    <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" />
  </svg>
);

const IconSubscriptions = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="14" height="12" rx="2" />
    <line x1="3" y1="8" x2="17" y2="8" />
    <line x1="7" y1="12" x2="13" y2="12" />
  </svg>
);

const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="3" />
    <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" />
  </svg>
);

const IconLogout = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17H4a2 2 0 01-2-2V5a2 2 0 012-2h3" />
    <polyline points="14,11 18,7 14,3" />
    <line x1="18" y1="7" x2="8" y2="7" />
  </svg>
);

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="7" cy="7" r="5" />
    <line x1="11" y1="11" x2="14" y2="14" />
  </svg>
);

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* ── Mobile Sidebar Toggle ─────────────────────────────────────── */}
      <button className="sidebar-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* ── Left Sidebar (WealthWise Style) ──────────────────────────── */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        
        {/* Brand Header */}
        <div className="sidebar-brand-wrapper">
          <Link to="/" className="sidebar-brand" onClick={() => setMobileOpen(false)}>
            <div className="sidebar-logo-container">
              <svg className="wealthwise-logo-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 16C4.5 13 6 10 9 8C12 6 15 8 16 11C16.5 12.5 18 15 20 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M6 18C7.5 15.5 10 13 13 13C16 13 17.5 15 19 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            {!collapsed && (
              <div className="sidebar-brand-text">
                <span className="brand-name">WealthWise</span>
                <span className="brand-chevron">↕</span>
              </div>
            )}
          </Link>
          <button className="sidebar-pane-toggle" onClick={onToggle} aria-label="Toggle sidebar width">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        {!collapsed && (
          <div className="sidebar-search">
            <span className="search-icon"><IconSearch /></span>
            <input 
              type="text" 
              placeholder="Search" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="search-hotkey">⌘K</span>
          </div>
        )}

        {/* Sidebar Scrollable Area */}
        <div className="sidebar-scrollable">
          
          {/* Main Menu Section */}
          <div className="sidebar-section">
            {!collapsed && <h4 className="section-header">Main menu</h4>}
            <div className="nav-items-list">
              <Link to="/" className={`sidebar-link-item ${isActive('/') ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                <span className="link-icon"><IconDashboard /></span>
                {!collapsed && <span className="link-label">Dashboard</span>}
              </Link>
              <Link to="/transactions" className={`sidebar-link-item ${isActive('/transactions') ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                <span className="link-icon"><IconTransactions /></span>
                {!collapsed && <span className="link-label">Transactions</span>}
              </Link>
              <Link to="/categories" className={`sidebar-link-item ${isActive('/categories') ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                <span className="link-icon"><IconSpending /></span>
                {!collapsed && <span className="link-label">Spending</span>}
              </Link>
              <Link to="/savings" className={`sidebar-link-item ${isActive('/savings') ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                <span className="link-icon"><IconInvestment /></span>
                {!collapsed && <span className="link-label">Investment</span>}
              </Link>
            </div>
          </div>

          {/* Managements Section */}
          <div className="sidebar-section">
            {!collapsed && <h4 className="section-header">Managements</h4>}
            <div className="nav-items-list">
              <Link to="/simulation" className={`sidebar-link-item ${isActive('/simulation') ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                <span className="link-icon"><IconPlanning /></span>
                {!collapsed && <span className="link-label">Financial Planning</span>}
              </Link>
              <Link to="/envelopes" className={`sidebar-link-item ${isActive('/envelopes') ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                <span className="link-icon"><IconManagement /></span>
                {!collapsed && (
                  <span className="link-label-with-badge">
                    <span>Management</span>
                    <span className="new-badge">New</span>
                  </span>
                )}
              </Link>
              <Link to="/scheduled-payments" className={`sidebar-link-item ${isActive('/scheduled-payments') ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                <span className="link-icon"><IconSubscriptions /></span>
                {!collapsed && <span className="link-label">Subscriptions</span>}
              </Link>
            </div>
          </div>

          {/* Support Widget */}
          {!collapsed && (
            <div className="support-widget">
              <button className="support-close-btn">×</button>
              <div className="support-header">
                <span className="support-icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M9 1C5 1 1 4 1 8.5c0 2 .8 3.5 2 5l-0.5 3 3-1.5c1 .4 2 .5 3.5.5 4 0 8-3 8-7S13 1 9 1z"/>
                    <circle cx="6" cy="8" r="0.5" fill="currentColor"/>
                    <circle cx="9" cy="8" r="0.5" fill="currentColor"/>
                    <circle cx="12" cy="8" r="0.5" fill="currentColor"/>
                  </svg>
                </span>
                <span className="support-title">Need support</span>
              </div>
              <p className="support-description">Contact with one of our expert to get support.</p>
              <button className="support-cta-btn" onClick={() => alert('Connecting to support expert...')}>
                Cal the expert
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Footer Bottom Controls */}
        <div className="sidebar-footer-controls">
          <button className="footer-control-btn" onClick={toggleTheme}>
            <span className="control-icon">
              {theme === 'light' ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="10" cy="10" r="4" />
                  <line x1="10" y1="2" x2="10" y2="4" />
                  <line x1="10" y1="16" x2="10" y2="18" />
                  <line x1="2" y1="10" x2="4" y2="10" />
                  <line x1="16" y1="10" x2="18" y2="10" />
                  <line x1="4.2" y1="4.2" x2="5.6" y2="5.6" />
                  <line x1="14.4" y1="14.4" x2="15.8" y2="15.8" />
                  <line x1="4.2" y1="15.8" x2="5.6" y2="14.4" />
                  <line x1="14.4" y1="5.6" x2="15.8" y2="4.2" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M10 2a8 8 0 100 16 6 6 0 010-16z" />
                </svg>
              )}
            </span>
            {!collapsed && <span className="control-label">Dark theme</span>}
          </button>
          
          <button className="footer-control-btn" onClick={() => navigate('/categories')}>
            <span className="control-icon"><IconSettings /></span>
            {!collapsed && <span className="control-label">Settings</span>}
          </button>

          {user && (
            <button className="footer-control-btn logout" onClick={handleLogout}>
              <span className="control-icon"><IconLogout /></span>
              {!collapsed && <span className="control-label">Log Out</span>}
            </button>
          )}
        </div>

      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
    </>
  );
};

export default Sidebar;