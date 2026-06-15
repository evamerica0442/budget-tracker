import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatCurrency, formatDate } from '../utils/formatting';
import SpendingAdvisor from '../components/SpendingAdvisor';
import '../styles/Dashboard.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const Dashboard: React.FC = () => {
  const { state } = useBudget();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Calculate current month data
  const currentMonthYear = currentMonth.getFullYear();
  const currentMonthNum = currentMonth.getMonth();

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

  // Category breakdown for pie chart
  const categoryData = state.categories
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
    .filter(item => item.value > 0);

  // Daily expense data for bar chart
  const dailyData = [];
  const daysInMonth = new Date(currentMonthYear, currentMonthNum + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayTransactions = monthlyTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      return (
        transactionDate.getDate() === day &&
        t.type === 'expense'
      );
    });

    const dayTotal = dayTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    dailyData.push({
      date: day,
      expenses: dayTotal
    });
  }

  // All monthly transactions sorted by date (ascending for statement)
  const allMonthlyTransactions = [...monthlyTransactions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

  // ── Print Statement Function ──────────────────────────────────────────
  const handlePrintStatement = () => {
    const monthLabel = `${MONTH_NAMES[currentMonthNum]} ${currentMonthYear}`;
    const now = new Date();
    const printedAt = `${now.toLocaleDateString('en-ZA')} ${now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;

    // Build category summary rows for the print table
    const catRows = categoryData
      .map(c => `<tr><td style="padding:4px 8px;border-bottom:1px solid #ddd;">${c.name}</td><td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:right;font-weight:600;">${formatCurrency(c.value)}</td></tr>`)
      .join('');

    // Build transaction table rows
    const txRows = allMonthlyTransactions
      .map(t => `
        <tr>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;">${formatDate(t.date)}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;">${t.description}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;">${t.category}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;color:${t.type === 'income' ? '#10b981' : '#ef4444'};font-weight:600;">
            ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
          </td>
        </tr>
      `)
      .join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the statement.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monthly Statement - ${monthLabel}</title>
        <style>
          @page { margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11pt;
            color: #1a1a2e;
            line-height: 1.5;
            padding: 0;
          }
          .header {
            text-align: center;
            padding-bottom: 16px;
            border-bottom: 3px solid #e94560;
            margin-bottom: 20px;
          }
          .header h1 { font-size: 20pt; font-weight: 800; letter-spacing: -0.5px; color: #1a1a2e; }
          .header .subtitle { font-size: 10pt; color: #6b7280; margin-top: 4px; }
          .header .badge { display: inline-block; background: #e94560; color: white; padding: 2px 12px; border-radius: 20px; font-size: 9pt; font-weight: 600; margin-top: 6px; }
          .summary-row { display: flex; gap: 12px; margin-bottom: 20px; }
          .summary-box {
            flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid #e5e7eb;
            text-align: center;
          }
          .summary-box .label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 4px; }
          .summary-box .value { font-size: 16pt; font-weight: 800; }
          .summary-box .value.positive { color: #10b981; }
          .summary-box .value.negative { color: #ef4444; }
          .summary-box.income { border-top: 3px solid #10b981; }
          .summary-box.expense { border-top: 3px solid #ef4444; }
          .summary-box.balance { border-top: 3px solid #3b82f6; }
          h2 { font-size: 12pt; font-weight: 700; margin: 16px 0 8px 0; color: #1a1a2e; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #f8f9fb; padding: 6px 8px; text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
          td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 10pt; }
          .footer { text-align: center; font-size: 8pt; color: #9ca3af; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
          .category-bar { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>💰 Budget Tracker — Monthly Statement</h1>
          <div class="subtitle">${monthLabel}</div>
          <div class="badge">${monthlyTransactions.length} transactions</div>
        </div>

        <div class="summary-row">
          <div class="summary-box income">
            <div class="label">Total Income</div>
            <div class="value positive">${formatCurrency(totalIncome)}</div>
          </div>
          <div class="summary-box expense">
            <div class="label">Total Expenses</div>
            <div class="value negative">${formatCurrency(totalExpenses)}</div>
          </div>
          <div class="summary-box balance">
            <div class="label">Net Balance</div>
            <div class="value ${netBalance >= 0 ? 'positive' : 'negative'}">${formatCurrency(netBalance)}</div>
          </div>
        </div>

        ${categoryData.length > 0 ? `
        <h2>📊 Expenses by Category</h2>
        <table>
          <thead><tr><th style="width:70%">Category</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>
            ${catRows}
            <tr style="font-weight:700;background:#f8f9fb;">
              <td style="padding:6px 8px;border-top:2px solid #1a1a2e;">Total Expenses</td>
              <td style="padding:6px 8px;border-top:2px solid #1a1a2e;text-align:right;color:#ef4444;">${formatCurrency(totalExpenses)}</td>
            </tr>
          </tbody>
        </table>
        ` : '<p style="color:#9ca3af;font-style:italic;">No expenses recorded this month.</p>'}

        <h2>📋 All Transactions</h2>
        ${allMonthlyTransactions.length > 0 ? `
        <table>
          <thead>
            <tr><th>Date</th><th>Description</th><th>Category</th><th style="text-align:right">Amount</th></tr>
          </thead>
          <tbody>
            ${txRows}
            <tr style="font-weight:700;background:#f8f9fb;">
              <td colspan="3" style="padding:8px;border-top:2px solid #1a1a2e;">Net Balance</td>
              <td style="padding:8px;border-top:2px solid #1a1a2e;text-align:right;color:${netBalance >= 0 ? '#10b981' : '#ef4444'};">${formatCurrency(netBalance)}</td>
            </tr>
          </tbody>
        </table>
        ` : '<p style="color:#9ca3af;font-style:italic;">No transactions recorded this month.</p>'}

        <div class="footer">
          Generated on ${printedAt} · Budget Tracker App
        </div>

        <div class="no-print" style="text-align:center;margin-top:24px;">
          <button onclick="window.print()" style="padding:10px 28px;background:#e94560;color:white;border:none;border-radius:8px;font-size:11pt;font-weight:600;cursor:pointer;">🖨️ Print / Save as PDF</button>
          <button onclick="window.close()" style="padding:10px 28px;background:#f0f2f5;color:#1a1a2e;border:1px solid #e5e7eb;border-radius:8px;font-size:11pt;font-weight:600;cursor:pointer;margin-left:8px;">Close</button>
        </div>

        <script>
          // Auto-trigger print dialog after a brief delay for rendering
          setTimeout(function() {
            var shouldPrint = confirm('Print this statement now?\\n\\nClick OK to print / Save as PDF.\\nClick Cancel to review first.');
            if (shouldPrint) { window.print(); }
          }, 500);
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Financial Overview</h2>
        <div className="header-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={handlePrintStatement}
            title="Print monthly statement"
          >
            🖨️ Statement
          </button>
          <div className="month-navigation">
            <button 
              className="nav-button" 
              onClick={() => navigateMonth('prev')}
              aria-label="Previous month"
            >
              &larr;
            </button>
            <h3>
              {MONTH_NAMES[currentMonthNum]} {currentMonthYear}
            </h3>
            <button 
              className="nav-button" 
              onClick={() => navigateMonth('next')}
              aria-label="Next month"
            >
              &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card income-card">
          <div className="card-header">
            <h3>Monthly Income</h3>
            <div className="icon income">💰</div>
          </div>
          <div className="card-content">
            <div className="amount">{formatCurrency(totalIncome)}</div>
            <div className="trend positive">
              {totalIncome > 0 ? '+0%' : 'No income'}
            </div>
          </div>
        </div>

        <div className="card expense-card">
          <div className="card-header">
            <h3>Monthly Expenses</h3>
            <div className="icon expense">💸</div>
          </div>
          <div className="card-content">
            <div className="amount">{formatCurrency(totalExpenses)}</div>
            <div className="trend negative">
              {totalExpenses > 0 ? `${((totalExpenses / totalIncome) * 100).toFixed(1)}% of income` : 'No expenses'}
            </div>
          </div>
        </div>

        <div className="card balance-card">
          <div className="card-header">
            <h3>Net Balance</h3>
            <div className={`icon ${netBalance >= 0 ? 'positive' : 'negative'}`}>
              {netBalance >= 0 ? '📈' : '📉'}
            </div>
          </div>
          <div className="card-content">
            <div className={`amount ${netBalance >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(netBalance)}
            </div>
            <div className="trend">
              {netBalance >= 0 ? 'Positive' : 'Negative'}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-container">
          <h3>Expenses by Category</h3>
          <div className="chart-wrapper">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No expenses recorded for this month</div>
            )}
          </div>
        </div>

        <div className="chart-container">
          <h3>Daily Expense Trends</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="expenses" fill="#3498db" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Spending Advisor Tips */}
      <SpendingAdvisor 
        transactions={state.transactions} 
        month={`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`} 
      />

      {/* Recent Transactions */}
      <div className="recent-transactions" style={{ marginTop: '1.5rem' }}>
        <h3>Recent Transactions</h3>
        <div className="transactions-list">
          {allMonthlyTransactions.length > 0 ? (
            allMonthlyTransactions.slice(-5).reverse().map(transaction => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-info">
                  <div className="transaction-description">
                    {transaction.description}
                  </div>
                  <div className="transaction-category">
                    {transaction.category}
                  </div>
                  <div className="transaction-date">
                    {formatDate(transaction.date)}
                  </div>
                </div>
                <div className={`transaction-amount ${transaction.type}`}>
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </div>
              </div>
            ))
          ) : (
            <div className="no-data">No transactions recorded</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;