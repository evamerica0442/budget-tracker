import React, { useState } from 'react';
import { useEnvelope } from '../context/EnvelopeContext';
import { useBudget } from '../context/BudgetContext';
import { Envelope } from '../types/budget';
import { formatCurrency } from '../utils/formatting';
import '../styles/Envelopes.css';

const Envelopes: React.FC = () => {
  const { state: envelopeState, addEnvelope, updateEnvelope, deleteEnvelope, addFunds, spend, refillEnvelope } = useEnvelope();
  const { state: budgetState } = useBudget();
  const [showModal, setShowModal] = useState(false);
  const [editingEnvelope, setEditingEnvelope] = useState<Envelope | null>(null);
  const [actionModal, setActionModal] = useState<{ type: 'add' | 'spend' | null; envelopeId: string | null }>({ type: null, envelopeId: null });
  const [actionAmount, setActionAmount] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    budgetAmount: '',
    currentAmount: '',
    category: '',
    color: '#3498db',
    period: 'monthly' as 'monthly' | 'weekly' | 'yearly' | 'one-time',
    autoRefill: true,
  });

  const handleOpenModal = (envelope?: Envelope) => {
    if (envelope) {
      setEditingEnvelope(envelope);
      setFormData({
        name: envelope.name,
        budgetAmount: envelope.budgetAmount.toString(),
        currentAmount: envelope.currentAmount.toString(),
        category: envelope.category || '',
        color: envelope.color,
        period: envelope.period,
        autoRefill: envelope.autoRefill,
      });
    } else {
      setEditingEnvelope(null);
      setFormData({
        name: '',
        budgetAmount: '',
        currentAmount: '',
        category: '',
        color: '#3498db',
        period: 'monthly',
        autoRefill: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEnvelope(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const envelopeData = {
        name: formData.name,
        budgetAmount: parseFloat(formData.budgetAmount),
        currentAmount: formData.currentAmount ? parseFloat(formData.currentAmount) : parseFloat(formData.budgetAmount),
        category: formData.category || undefined,
        color: formData.color,
        period: formData.period,
        startDate: new Date().toISOString(),
        autoRefill: formData.autoRefill,
      };

      if (editingEnvelope) {
        await updateEnvelope({ ...envelopeData, id: editingEnvelope.id });
      } else {
        await addEnvelope(envelopeData);
      }
      
      handleCloseModal();
    } catch (error) {
      console.error('Error saving envelope:', error);
      alert('Failed to save envelope. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this envelope?')) {
      try {
        await deleteEnvelope(id);
      } catch (error) {
        console.error('Error deleting envelope:', error);
        alert('Failed to delete envelope. Please try again.');
      }
    }
  };

  const handleAction = async (type: 'add' | 'spend', envelopeId: string) => {
    setActionModal({ type, envelopeId });
    setActionAmount('');
  };

  const handleActionSubmit = async () => {
    if (!actionModal.envelopeId || !actionAmount) return;

    const amount = parseFloat(actionAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      if (actionModal.type === 'add') {
        await addFunds(actionModal.envelopeId, amount);
      } else if (actionModal.type === 'spend') {
        await spend(actionModal.envelopeId, amount);
      }
      setActionModal({ type: null, envelopeId: null });
      setActionAmount('');
    } catch (error) {
      console.error('Error performing action:', error);
      alert('Failed to perform action. Please try again.');
    }
  };

  const handleRefill = async (id: string) => {
    try {
      await refillEnvelope(id);
    } catch (error) {
      console.error('Error refilling envelope:', error);
      alert('Failed to refill envelope. Please try again.');
    }
  };

  const getPercentage = (current: number, budget: number) => {
    return budget > 0 ? (current / budget) * 100 : 0;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage > 100) return '#e74c3c'; // Red - overspent
    if (percentage > 75) return '#f39c12'; // Orange - warning
    return '#27ae60'; // Green - good
  };

  const expenseCategories = budgetState.categories.filter(cat => cat.type === 'expense');

  return (
    <div className="envelopes-page">
      <div className="page-header">
        <h2>💰 Envelope Budgeting</h2>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + Create Envelope
        </button>
      </div>

      {envelopeState.error && (
        <div className="alert alert-warning">
          {envelopeState.error}
        </div>
      )}

      {envelopeState.loading ? (
        <div className="loading">Loading envelopes...</div>
      ) : envelopeState.envelopes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No Envelopes Yet</h3>
          <p>Create your first envelope to start budgeting with the envelope method!</p>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            Create Your First Envelope
          </button>
        </div>
      ) : (
        <div className="envelopes-grid">
          {envelopeState.envelopes.map(envelope => {
            const percentage = getPercentage(envelope.currentAmount, envelope.budgetAmount);
            const progressColor = getProgressColor(percentage);

            return (
              <div key={envelope.id} className="envelope-card" style={{ borderLeftColor: envelope.color }}>
                <div className="envelope-header">
                  <h3>{envelope.name}</h3>
                  <div className="envelope-actions">
                    <button 
                      className="btn-icon" 
                      onClick={() => handleOpenModal(envelope)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-icon" 
                      onClick={() => handleDelete(envelope.id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="envelope-body">
                  <div className="envelope-amounts">
                    <div className="amount-item">
                      <span className="label">Current</span>
                      <span className="value" style={{ color: progressColor }}>
                        {formatCurrency(envelope.currentAmount)}
                      </span>
                    </div>
                    <div className="amount-item">
                      <span className="label">Budget</span>
                      <span className="value">{formatCurrency(envelope.budgetAmount)}</span>
                    </div>
                  </div>

                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${Math.min(percentage, 100)}%`,
                        backgroundColor: progressColor 
                      }}
                    />
                  </div>
                  <div className="progress-text">
                    {percentage.toFixed(1)}% used
                  </div>

                  <div className="envelope-meta">
                    <span className="badge">{envelope.period}</span>
                    {envelope.category && (
                      <span className="badge category">{envelope.category}</span>
                    )}
                  </div>

                  <div className="envelope-buttons">
                    <button 
                      className="btn btn-sm btn-success" 
                      onClick={() => handleAction('add', envelope.id)}
                    >
                      + Add Funds
                    </button>
                    <button 
                      className="btn btn-sm btn-warning" 
                      onClick={() => handleAction('spend', envelope.id)}
                    >
                      - Spend
                    </button>
                    <button 
                      className="btn btn-sm btn-info" 
                      onClick={() => handleRefill(envelope.id)}
                    >
                      🔄 Refill
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingEnvelope ? 'Edit Envelope' : 'Create New Envelope'}</h3>
              <button className="btn-close" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Envelope Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Groceries, Entertainment"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Budget Amount *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.budgetAmount}
                    onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>Current Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.currentAmount}
                    onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                    min="0"
                    step="0.01"
                    placeholder="Same as budget"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Period</label>
                  <select
                    className="form-control"
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Color</label>
                  <input
                    type="color"
                    className="form-control color-input"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Link to Category (Optional)</label>
                <select
                  className="form-control"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">-- No Category --</option>
                  {expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>
                      {cat.displayName || cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.autoRefill}
                    onChange={(e) => setFormData({ ...formData, autoRefill: e.target.checked })}
                  />
                  <span>Auto-refill at start of period</span>
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingEnvelope ? 'Update' : 'Create'} Envelope
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Spend Modal */}
      {actionModal.type && (
        <div className="modal-overlay" onClick={() => setActionModal({ type: null, envelopeId: null })}>
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{actionModal.type === 'add' ? 'Add Funds' : 'Spend from Envelope'}</h3>
              <button className="btn-close" onClick={() => setActionModal({ type: null, envelopeId: null })}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  className="form-control"
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setActionModal({ type: null, envelopeId: null })}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className={`btn ${actionModal.type === 'add' ? 'btn-success' : 'btn-warning'}`}
                onClick={handleActionSubmit}
              >
                {actionModal.type === 'add' ? 'Add Funds' : 'Spend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Envelopes;
