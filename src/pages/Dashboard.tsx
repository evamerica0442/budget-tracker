import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatCurrency, formatMonthYear, formatDate } from '../utils/formatting';
import SpendingAdvisor from '../components/SpendingAdvisor';
import '../styles/Dashboard.css';

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
    const dayDate = new Date(currentMonthYear, currentMonthNum, day);
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

  // Recent transactions
  const recentTransactions = [...state.transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Using formatCurrency from utils (already configured for ZAR)

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

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Financial Overview</h2>
        <div className="month-navigation">
          <button 
            className="nav-button" 
            onClick={() => navigateMonth('prev')}
            aria-label="Previous month"
          >
            &larr;
          </button>
          <h3>
            {monthNames[currentMonthNum]} {currentMonthYear}
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
          {recentTransactions.length > 0 ? (
            recentTransactions.map(transaction => (
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