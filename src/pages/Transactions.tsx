import React, { useState, useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import { formatCurrency, formatDate } from '../utils/formatting';
import { Transaction } from '../types/budget';
import '../styles/Transactions.css';

interface TransactionFormData {
  type: 'income' | 'expense';
  amount: string;
  description: string;
  category: string;
  date: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const Transactions: React.FC = () => {
  const { state, addTransaction, updateTransaction, deleteTransaction, duplicateTransactions } = useBudget();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'expense',
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0]
  });

  // ── Duplicate state ────────────────────────────────────────────────────
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateTargetMonth, setDuplicateTargetMonth] = useState<number>(() => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return next.getMonth();
  });
  const [duplicateTargetYear, setDuplicateTargetYear] = useState<number>(() => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return next.getFullYear();
  });
  const [duplicating, setDuplicating] = useState(false);

  // ── Month/Year filter state ────────────────────────────────────────────
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());

  // ── Derive available years and months from transactions ────────────────
  const availablePeriods = useMemo(() => {
    const periods = new Map<string, { year: number; month: number; count: number }>();

    state.transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const existing = periods.get(key);
      if (existing) {
        existing.count++;
      } else {
        periods.set(key, { year: d.getFullYear(), month: d.getMonth(), count: 1 });
      }
    });

    return Array.from(periods.values()).sort((a, b) =>
      b.year !== a.year ? b.year - a.year : b.month - a.month
    );
  }, [state.transactions]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    state.transactions.forEach(t => years.add(new Date(t.date).getFullYear()));
    const sorted = Array.from(years).sort((a, b) => b - a);
    if (!sorted.includes(now.getFullYear())) sorted.unshift(now.getFullYear());
    return sorted;
  }, [state.transactions, now]);

  // ── Filter transactions by selected month/year ─────────────────────────
  const filteredTransactions = useMemo(() => {
    return state.transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, selectedMonth, selectedYear]);

  const filteredIncome = filteredTransactions.filter(t => t.type === 'income');
  const filteredExpenses = filteredTransactions.filter(t => t.type === 'expense');

  // ── Navigation ─────────────────────────────────────────────────────────
  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.description || !formData.category) {
      alert('Please fill in all required fields');
      return;
    }

    const transactionData = {
      type: formData.type,
      amount: parseFloat(formData.amount),
      description: formData.description,
      category: formData.category,
      date: formData.date
    };

    if (editingTransaction) {
      updateTransaction({
        ...transactionData,
        id: editingTransaction
      });
      setEditingTransaction(null);
    } else {
      addTransaction(transactionData);
    }

    // Auto-navigate to the month of the new transaction
    const txDate = new Date(formData.date);
    setSelectedMonth(txDate.getMonth());
    setSelectedYear(txDate.getFullYear());

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      type: 'expense',
      amount: '',
      description: '',
      category: '',
      date: new Date().toISOString().split('T')[0]
    });
    setEditingTransaction(null);
    setShowAddForm(false);
  };

  const handleEdit = (transaction: Transaction) => {
    const dateValue = typeof transaction.date !== 'string' 
      ? transaction.date.toISOString().split('T')[0] 
      : transaction.date;

    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      description: transaction.description,
      category: transaction.category,
      date: dateValue
    });
    setEditingTransaction(transaction.id);
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction(id);
    }
  };

  // ── Duplicate handler ──────────────────────────────────────────────────
  const handleDuplicate = async () => {
    if (duplicating) return;

    const sourceMonth = selectedMonth + 1; // convert 0-based to 1-based
    const sourceYear = selectedYear;

    if (sourceYear === duplicateTargetYear && sourceMonth === duplicateTargetMonth) {
      alert('Source and target months must be different.');
      return;
    }

    const confirmMsg = `Duplicate all transactions from ${MONTH_NAMES[selectedMonth]} ${selectedYear} to ${MONTH_NAMES[duplicateTargetMonth]} ${duplicateTargetYear}?`;
    if (!window.confirm(confirmMsg)) return;

    setDuplicating(true);
    try {
      const count = await duplicateTransactions({
        sourceYear,
        sourceMonth,
        targetYear: duplicateTargetYear,
        targetMonth: duplicateTargetMonth + 1, // convert 0-based to 1-based
      });
      alert(`Successfully duplicated ${count} transaction(s) to ${MONTH_NAMES[duplicateTargetMonth]} ${duplicateTargetYear}.`);
      setShowDuplicateDialog(false);
      // Navigate to target month
      setSelectedYear(duplicateTargetYear);
      setSelectedMonth(duplicateTargetMonth);
    } catch (err: any) {
      alert(`Failed to duplicate transactions: ${err.message}`);
    } finally {
      setDuplicating(false);
    }
  };

  const openDuplicateDialog = () => {
    // Default target to next month
    const next = new Date(selectedYear, selectedMonth + 1);
    setDuplicateTargetMonth(next.getMonth());
    setDuplicateTargetYear(next.getFullYear());
    setShowDuplicateDialog(true);
  };

  return (
    <div className="transactions-page">
      <div className="page-header">
        <h2>Transaction Management</h2>
        <div className="page-header-actions">
          <button 
            className="btn btn-secondary"
            onClick={openDuplicateDialog}
            disabled={filteredTransactions.length === 0}
            title={filteredTransactions.length === 0 ? 'No transactions to duplicate in the current month' : 'Duplicate this month to another month'}
          >
            📋 Duplicate Month
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel' : 'Add Transaction'}
          </button>
        </div>
      </div>

      {/* ── Duplicate Dialog ──────────────────────────────────────────────── */}
      {showDuplicateDialog && (
        <div className="transaction-form-container">
          <div className="form-header">
            <h3>Duplicate {MONTH_NAMES[selectedMonth]} {selectedYear} to...</h3>
            <button className="close-btn" onClick={() => setShowDuplicateDialog(false)}>&times;</button>
          </div>
          <div className="duplicate-form">
            <p className="duplicate-info">
              This will copy all <strong>{filteredTransactions.length}</strong> transaction(s) from{' '}
              <strong>{MONTH_NAMES[selectedMonth]} {selectedYear}</strong> to:
            </p>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dupMonth">Target Month</label>
                <select
                  id="dupMonth"
                  value={duplicateTargetMonth}
                  onChange={e => setDuplicateTargetMonth(Number(e.target.value))}
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="dupYear">Target Year</label>
                <select
                  id="dupYear"
                  value={duplicateTargetYear}
                  onChange={e => setDuplicateTargetYear(Number(e.target.value))}
                >
                  {[...Array(10)].map((_, i) => {
                    const year = now.getFullYear() - 2 + i;
                    return (
                      <option key={year} value={year}>{year}</option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={handleDuplicate}
                disabled={duplicating}
              >
                {duplicating ? 'Duplicating...' : 'Duplicate Transactions'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDuplicateDialog(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Month/Year Picker ──────────────────────────────────────────────── */}
      <div className="tx-month-picker">
        <button className="month-arrow" onClick={goToPrevMonth} aria-label="Previous month">
          ‹
        </button>

        <div className="month-selector-group">
          {/* Month dropdown */}
          <select
            className="month-select"
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx} value={idx}>{name}</option>
            ))}
          </select>

          {/* Year dropdown */}
          <select
            className="year-select"
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <button className="month-arrow" onClick={goToNextMonth} aria-label="Next month">
          ›
        </button>

        {/* Quick-jump month chips */}
        <div className="month-chips">
          {availablePeriods.slice(0, 6).map(p => (
            <button
              key={`${p.year}-${p.month}`}
              className={`month-chip ${p.year === selectedYear && p.month === selectedMonth ? 'active' : ''}`}
              onClick={() => {
                setSelectedYear(p.year);
                setSelectedMonth(p.month);
              }}
            >
              {MONTH_NAMES[p.month].slice(0, 3)} {p.year}
              <span className="chip-count">{p.count}</span>
            </button>
          ))}
        </div>
      </div>

      {showAddForm && (
        <div className="transaction-form-container">
          <div className="form-header">
            <h3>{editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}</h3>
            <button className="close-btn" onClick={resetForm}>&times;</button>
          </div>
          
          <form className="transaction-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="type">Type</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="amount">Amount *</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter description"
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select a category</option>
                  {state.categories
                    .filter(cat => cat.type === formData.type)
                    .map(category => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingTransaction ? 'Update Transaction' : 'Add Transaction'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Summary for Selected Month ──────────────────────────────────────── */}
      <div className="transactions-summary">
        <div className="summary-card">
          <h3>Income • {MONTH_NAMES[selectedMonth].slice(0, 3)} {selectedYear}</h3>
          <div className="amount positive">
            {formatCurrency(
              filteredIncome.reduce((sum, t) => sum + t.amount, 0)
            )}
          </div>
        </div>
        <div className="summary-card">
          <h3>Expenses • {MONTH_NAMES[selectedMonth].slice(0, 3)} {selectedYear}</h3>
          <div className="amount negative">
            {formatCurrency(
              filteredExpenses.reduce((sum, t) => sum + t.amount, 0)
            )}
          </div>
        </div>
        <div className="summary-card">
          <h3>Net Balance</h3>
          <div className={`amount ${
            filteredIncome.reduce((sum, t) => sum + t.amount, 0) - 
            filteredExpenses.reduce((sum, t) => sum + t.amount, 0) >= 0 ? 'positive' : 'negative'
          }`}>
            {formatCurrency(
              filteredIncome.reduce((sum, t) => sum + t.amount, 0) - 
              filteredExpenses.reduce((sum, t) => sum + t.amount, 0)
            )}
          </div>
        </div>
      </div>

      <div className="transactions-list">
        <h3>
          Transactions for {MONTH_NAMES[selectedMonth]} {selectedYear}
          <span className="tx-count">({filteredTransactions.length})</span>
        </h3>
        {filteredTransactions.length > 0 ? (
          <div className="table-container">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(transaction => (
                  <tr key={transaction.id}>
                    <td data-label="Date">{formatDate(transaction.date)}</td>
                    <td data-label="Description">{transaction.description}</td>
                    <td data-label="Category">
                      <span 
                        className="category-badge"
                        style={{ 
                          backgroundColor: state.categories.find(c => c.name === transaction.category)?.color || '#ccc',
                          color: 'white'
                        }}
                      >
                        {transaction.category}
                      </span>
                    </td>
                    <td data-label="Type">
                      <span className={`type-badge ${transaction.type}`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td data-label="Amount" className={`amount ${transaction.type}`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td data-label="Actions" className="actions">
                      <button 
                        className="btn-icon"
                        onClick={() => handleEdit(transaction)}
                        title="Edit transaction"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-icon"
                        onClick={() => handleDelete(transaction.id)}
                        title="Delete transaction"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data">
            No transactions found for {MONTH_NAMES[selectedMonth]} {selectedYear}.
            {state.transactions.length > 0 ? (
              <span> Try selecting a different month above.</span>
            ) : (
              <span> Add your first transaction to get started!</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;