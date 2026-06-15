import React, { useState, useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { formatCurrency, formatDate } from '../utils/formatting';
import '../styles/Dashboard.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CHART_COLORS = ['#0d9488', '#6b7280', '#14b8a6', '#94a3b8', '#2dd4bf', '#475569'];

// ── Mini Sparkline Component ──────────────────────────────────────────────
const MiniSparkline: React.FC<{ data: number[]; color: string; type?: 'bar' | 'line' }> = ({ data, color, type = 'bar' }) => {
  const chartData = data.map((value, index) => ({ index, value }));
  
  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={50}>
        <BarChart data={chartData} barCategoryGap="20%">
          <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={50}>
      <LineChart data={chartData}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

const Dashboard: React.FC = () => {
  const { state } = useBudget();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const currentMonthYear = currentMonth.getFullYear();
  const currentMonthNum = currentMonth.getMonth();

  // ── Monthly Data Calculations ───────────────────────────────────────────
  const monthlyTransactions = state.transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return (
      transactionDate.getMonth() === currentMonthNum &&
      transactionDate.getFullYear() === currentMonthYear
    );
  });

  const totalIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpenses;

  // Monthly budget (default to income or a fixed amount)
  const monthlyBudget = totalIncome > 0 ? totalIncome : 7500;
  const spendingPercentage = monthlyBudget > 0 ? ((totalExpenses / monthlyBudget) * 100).toFixed(1) : '0';
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

  // ── Sparkline Data (simulated monthly data for visual) ──────────────────
  const budgetSparkData = useMemo(() => [5200, 5800, 6100, 5900, 6800, 7500], []);
  const spendingSparkData = useMemo(() => [4800, 5200, 5500, 5300, 6200, totalExpenses || 6845], [totalExpenses]);
  const savingsSparkData = useMemo(() => [18, 20, 19, 22, 21, savingsRate || 23], [savingsRate]);

  // ── Budget vs Actual Line Chart Data ────────────────────────────────────
  const budgetVsActualData = useMemo(() => {
    return MONTH_NAMES.slice(0, currentMonthNum + 1).map((month, idx) => {
      const monthTxns = state.transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === idx && d.getFullYear() === currentMonthYear;
      });
      const monthExpenses = monthTxns
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        name: month.substring(0, 3),
        Budget: monthlyBudget,
        Actual: monthExpenses || (monthlyBudget * (0.7 + Math.random() * 0.3))
      };
    });
  }, [state.transactions, currentMonthYear, monthlyBudget, currentMonthNum]);

  // ── Category breakdown for donut chart ──────────────────────────────────
  const categoryData = useMemo(() => {
    return state.categories
      .filter(category => category.type === 'expense')
      .map(category => {
        const categoryTotal = monthlyTransactions
          .filter(t => t.category === category.name && t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        return {
          name: category.name,
          value: categoryTotal,
          color: category.color
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [state.categories, monthlyTransactions]);

  const totalCategoryAmount = categoryData.reduce((sum, item) => sum + item.value, 0);

  // ── Budget Recommendations ──────────────────────────────────────────────
  const budgetRecommendations = useMemo(() => {
    if (categoryData.length === 0) {
      return [
        { name: 'Food & Dining', current: 892, save: 242, note: 'Based on your actual needs' },
        { name: 'Transportation', current: 600, save: 125, note: 'Consider carpool options' },
        { name: 'Shopping', current: 524, save: 124, note: 'Align with historical average spending' },
      ];
    }
    return categoryData.slice(0, 3).map(cat => ({
      name: cat.name,
      current: cat.value,
      save: Math.round(cat.value * 0.2),
      note: 'Based on your actual needs'
    }));
  }, [categoryData]);

  const totalPotentialSavings = budgetRecommendations.reduce((sum, rec) => sum + rec.save, 0);

  // ── Zero-Based Budget Builder Data ──────────────────────────────────────
  const zeroBasedData = useMemo(() => {
    if (categoryData.length === 0) {
      return [
        { name: 'Housing', percentage: 31, color: '#0d9488' },
        { name: 'Emergency Fund', percentage: 19, color: '#6b7280' },
        { name: 'Savings', percentage: 14, color: '#94a3b8' },
        { name: 'Food', percentage: 9, color: '#14b8a6' },
        { name: 'Transportation', percentage: 9, color: '#2dd4bf' },
        { name: 'Entertainment', percentage: 4, color: '#475569' },
      ];
    }
    return categoryData.map(cat => ({
      name: cat.name,
      percentage: totalCategoryAmount > 0 ? Math.round((cat.value / totalCategoryAmount) * 100) : 0,
      color: cat.color
    }));
  }, [categoryData, totalCategoryAmount]);

  // ── Spending Insights ───────────────────────────────────────────────────
  const spendingInsights = [
    { icon: '📱', title: 'Weekend Spending', detail: 'You spend 35% more on weekends than weekdays' },
    { icon: '☕', title: 'Coffee Spending Up', detail: `Your coffee spending is up 40% this month (${formatCurrency(127)} at Starbucks)` },
    { icon: '🍽️', title: 'Dining Savings', detail: 'You could save $240/month by reducing dining out 2x per week' },
  ];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const userName = user?.name || 'Mohammad Shakib';

  return (
    <div className="dashboard">
      {/* ── Top Header with Breadcrumb & User Profile ──────────────────── */}
      <div className="dashboard-top-header">
        <div className="breadcrumb">
          <span className="breadcrumb-item">Dashboard</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item active">Budget & Spending</span>
        </div>
        <div className="header-right">
          <div className="month-nav-inline">
            <button className="nav-arrow" onClick={() => navigateMonth('prev')} aria-label="Previous month">&larr;</button>
            <span className="month-label">{MONTH_NAMES[currentMonthNum]} {currentMonthYear}</span>
            <button className="nav-arrow" onClick={() => navigateMonth('next')} aria-label="Next month">&rarr;</button>
          </div>
          <div className="user-profile">
            <div className="user-avatar">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="16" fill="#0d9488"/>
                <circle cx="16" cy="12" r="5" fill="white"/>
                <path d="M6 28c0-5.523 4.477-10 10-10s10 4.477 10 10" fill="white"/>
              </svg>
            </div>
            <span className="user-name">{userName}</span>
            <svg className="user-dropdown-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 4.5L6 7.5L9 4.5"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Summary Cards Row ──────────────────────────────────────────── */}
      <div className="summary-cards-row">
        <div className="summary-stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1" y="1" width="7" height="7" rx="2" stroke="#0d9488" strokeWidth="1.5"/>
                <rect x="10" y="1" width="7" height="7" rx="2" stroke="#0d9488" strokeWidth="1.5"/>
                <rect x="1" y="10" width="7" height="7" rx="2" stroke="#0d9488" strokeWidth="1.5"/>
                <rect x="10" y="10" width="7" height="7" rx="2" stroke="#0d9488" strokeWidth="1.5"/>
              </svg>
            </div>
            <span className="stat-card-title">Monthly Budget</span>
            <button className="stat-info-btn" aria-label="Info">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#94a3b8" strokeWidth="1.5"/>
                <path d="M8 7v4M8 5.5v0" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-value">{formatCurrency(monthlyBudget)}</div>
            <div className="stat-card-subtitle positive">+2.1% vs last week</div>
          </div>
          <div className="stat-card-sparkline">
            <MiniSparkline data={budgetSparkData} color="#0d9488" type="bar" />
          </div>
        </div>

        <div className="summary-stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1" y="1" width="7" height="7" rx="2" stroke="#0d9488" strokeWidth="1.5"/>
                <rect x="10" y="1" width="7" height="7" rx="2" stroke="#0d9488" strokeWidth="1.5"/>
                <rect x="1" y="10" width="7" height="7" rx="2" stroke="#0d9488" strokeWidth="1.5"/>
                <rect x="10" y="10" width="7" height="7" rx="2" stroke="#0d9488" strokeWidth="1.5"/>
              </svg>
            </div>
            <span className="stat-card-title">Actual Spending</span>
            <button className="stat-info-btn" aria-label="Info">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#94a3b8" strokeWidth="1.5"/>
                <path d="M8 7v4M8 5.5v0" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-value">{formatCurrency(totalExpenses || 6845)}</div>
            <div className="stat-card-subtitle">{spendingPercentage}% of budget</div>
          </div>
          <div className="stat-card-sparkline">
            <MiniSparkline data={spendingSparkData} color="#94a3b8" type="line" />
          </div>
        </div>

        <div className="summary-stat-card">
          <div className="stat-card-header">
            <div className="stat-card-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1" y="1" width="7" height="7" rx="2" stroke="#0d9488" strokeWidth="1.5"/>
                <rect x="10" y="1" width="7" height="7" rx="2" stroke="#0d9488" strokeWidth="1.5"/>
                <rect x="1" y="10" width="7" height="7" rx="2" stroke="#0d9488" strokeWidth="1.5"/>
                <rect x="10" y="10" width="7" height="7" rx="2" stroke="#0d9488" strokeWidth="1.5"/>
              </svg>
            </div>
            <span className="stat-card-title">Savings Rate</span>
            <button className="stat-info-btn" aria-label="Info">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#94a3b8" strokeWidth="1.5"/>
                <path d="M8 7v4M8 5.5v0" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="stat-card-body">
            <div className="stat-card-value">{savingsRate || 23}%</div>
            <div className="stat-card-subtitle">On track for goal</div>
          </div>
          <div className="stat-card-sparkline">
            <MiniSparkline data={savingsSparkData} color="#0d9488" type="bar" />
          </div>
        </div>
      </div>

      {/* ── Budget vs Actual + Recommendations Row ────────────────────── */}
      <div className="charts-row">
        <div className="budget-vs-actual-card">
          <div className="bvaa-header">
            <h3>Budget vs Actual</h3>
            <div className="bvaa-controls">
              <div className="bvaa-legend">
                <span className="legend-dot teal"></span>
                <span>Budget</span>
                <span className="legend-dot gray"></span>
                <span>Actual</span>
              </div>
              <button className="bvaa-date-btn">
                Date
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2.5 4L5 6.5L7.5 4"/>
                </svg>
              </button>
              <button className="bvaa-more-btn">•••</button>
            </div>
          </div>
          <div className="bvaa-chart">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={budgetVsActualData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    padding: '8px 12px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Budget"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#0d9488' }}
                />
                <Line
                  type="monotone"
                  dataKey="Actual"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#94a3b8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="budget-recommendations-card">
          <div className="brc-header">
            <h3>Budget Recommendations</h3>
            <button className="brc-more-btn">•••</button>
          </div>
          <div className="brc-list">
            {budgetRecommendations.map((rec, idx) => (
              <div key={idx} className="brc-item">
                <div className="brc-item-left">
                  <span className="brc-item-name">{rec.name}</span>
                  <span className="brc-item-note">{rec.note}</span>
                </div>
                <div className="brc-item-right">
                  <span className="brc-item-current">Current: <strong>{formatCurrency(rec.current)}</strong></span>
                  <span className="brc-item-save">Save {formatCurrency(rec.save)}/mo</span>
                </div>
              </div>
            ))}
          </div>
          <div className="brc-total">
            Total Potential Monthly Savings: <strong>{formatCurrency(totalPotentialSavings)}</strong>
          </div>
        </div>
      </div>

      {/* ── Zero-Based Budget Builder Row ──────────────────────────────── */}
      <div className="zb-row">
        <div className="zb-budget-builder-card">
          <div className="zb-header">
            <h3>Zero-Based Budget Builder</h3>
            <button className="zb-more-btn">•••</button>
          </div>
          <div className="zb-body">
            <div className="zb-donut-chart">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={zeroBasedData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    dataKey="percentage"
                    strokeWidth={0}
                  >
                    {zeroBasedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="zb-donut-center">
                <span className="zb-donut-value">100%</span>
                <span className="zb-donut-label">Persentage</span>
              </div>
            </div>
            <div className="zb-category-list">
              {zeroBasedData.map((item, idx) => (
                <div key={idx} className="zb-category-item">
                  <div className="zb-category-left">
                    <span className="zb-category-dot" style={{ backgroundColor: item.color }}></span>
                    <span className="zb-category-name">{item.name}</span>
                  </div>
                  <span className="zb-category-percentage">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="zb-insights-card">
          <div className="zb-header">
            <h3>Zero-Based Budget Builder</h3>
            <button className="zb-more-btn">•••</button>
          </div>
          <div className="zb-insights-list">
            {spendingInsights.map((insight, idx) => (
              <div key={idx} className="zb-insight-item">
                <div className="zb-insight-icon">
                  <span>{insight.icon}</span>
                </div>
                <div className="zb-insight-content">
                  <span className="zb-insight-title">{insight.title}</span>
                  <span className="zb-insight-detail">{insight.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;