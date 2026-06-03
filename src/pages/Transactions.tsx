import React, { useState } from 'react';
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

const Transactions: React.FC = () => {
  const { state, addTransaction, updateTransaction, deleteTransaction } = useBudget();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'expense',
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0]
  });

  const filteredTransactions = [...state.transactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

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

  // Using formatCurrency from utils (already configured for ZAR)

  const filteredIncome = filteredTransactions.filter(t => t.type === 'income');
  const filteredExpenses = filteredTransactions.filter(t => t.type === 'expense');

  return (
    <div className="transactions-page">
      <div className="page-header">
        <h2>Transaction Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add Transaction'}
        </button>
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

      <div className="transactions-summary">
        <div className="summary-card">
          <h3>Total Income</h3>
          <div className="amount positive">
            {formatCurrency(
              filteredIncome.reduce((sum, t) => sum + t.amount, 0)
            )}
          </div>
        </div>
        <div className="summary-card">
          <h3>Total Expenses</h3>
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
        <h3>Recent Transactions</h3>
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
                    <td>{formatDate(transaction.date)}</td>
                    <td>{transaction.description}</td>
                    <td>
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
                    <td>
                      <span className={`type-badge ${transaction.type}`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className={`amount ${transaction.type}`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="actions">
                      <button 
                        className="btn btn-sm btn-edit"
                        onClick={() => handleEdit(transaction)}
                        title="Edit transaction"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn btn-sm btn-delete"
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
            No transactions found. Add your first transaction to get started!
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;