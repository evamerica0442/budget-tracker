import React, { useState, useEffect } from 'react';
import { useSavingsGoal } from '../context/SavingsGoalContext';
import { useBudget } from '../context/BudgetContext';
import { SavingsGoal } from '../types/budget';
import { formatCurrency } from '../utils/formatting';
import '../styles/SavingsGoals.css';

// Custom lightweight inline Confetti Component
const Confetti: React.FC<{ active: boolean }> = ({ active }) => {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#e67e22'];
    const newParticles = Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * -20 - 10,
      size: Math.random() * 8 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 3,
      duration: Math.random() * 3 + 2,
      rotation: Math.random() * 360,
    }));

    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
    }, 6000);

    return () => clearTimeout(timer);
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="confetti-container">
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
};

// ─── Distribution Bucket Definitions ─────────────────────────────────────────
interface DistributionBucket {
  id: string;
  label: string;
  percent: number;
  color: string;
  keywords: string[];
  icon: string;
}

const DISTRIBUTION_BUCKETS: DistributionBucket[] = [
  { id: 'emergency',    label: 'Emergency Fund',           percent: 0.50, color: '#e74c3c', keywords: ['emergency'],               icon: '🛡️' },
  { id: 'medium-term',  label: 'Medium Term Goals',        percent: 0.25, color: '#f39c12', keywords: ['medium', 'mid-term'],       icon: '🏠' },
  { id: 'short-term',   label: 'Short Term Goals',          percent: 0.15, color: '#3498db', keywords: ['short'],                   icon: '🎯' },
  { id: 'education',    label: 'Education & Career',        percent: 0.10, color: '#9b59b6', keywords: ['education', 'career', 'course', 'skill', 'training'], icon: '📚' },
];

// ─── Component ───────────────────────────────────────────────────────────────

const SavingsGoals: React.FC = () => {
  const { state: goalState, addGoal, updateGoal, deleteGoal, contribute } = useSavingsGoal();
  const { state: budgetState } = useBudget();
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [actionModal, setActionModal] = useState<{ goalId: string | null; maxAmount: number }>({ goalId: null, maxAmount: 0 });
  const [actionAmount, setActionAmount] = useState('');
  const [triggerConfetti, setTriggerConfetti] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [distributeResult, setDistributeResult] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    color: '#2ecc71',
  });

  // Calculate current month's net balance
  const now = new Date();
  const currentMonthNum = now.getMonth();
  const currentMonthYear = now.getFullYear();

  const monthlyTransactions = budgetState.transactions.filter(transaction => {
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

  // ── Auto-Distribution Logic ────────────────────────────────────────────────

  /** Find the first goal whose name matches one of the bucket's keywords (case-insensitive). */
  const findGoalForBucket = (bucket: DistributionBucket): SavingsGoal | undefined =>
    goalState.goals.find(g =>
      bucket.keywords.some(kw => g.name.toLowerCase().includes(kw))
    );

  /** Compute the amount that should go to each bucket (truncated to 2 decimals). */
  const computeDistribution = (): { bucket: DistributionBucket; amount: number; goal?: SavingsGoal }[] => {
    if (netBalance <= 0) return [];

    return DISTRIBUTION_BUCKETS.map(bucket => ({
      bucket,
      amount: Math.floor(netBalance * bucket.percent * 100) / 100,
      goal: findGoalForBucket(bucket),
    }));
  };

  const distribution = computeDistribution();
  const totalDistributed = distribution.reduce((s, d) => s + d.amount, 0);
  const surplusAfterDistribute = netBalance - totalDistributed;

  /** Execute the auto-distribution: contribute to all matched goals. */
  const handleAutoDistribute = async () => {
    if (netBalance <= 0) return;
    setDistributing(true);
    setDistributeResult(null);

    const results: string[] = [];

    for (const item of distribution) {
      if (!item.goal) {
        results.push(`❌ ${item.bucket.label}: No matching goal found`);
        continue;
      }
      if (item.amount <= 0) continue;

      try {
        await contribute(item.goal.id, item.amount);
        results.push(`✅ ${item.bucket.label}: ${formatCurrency(item.amount)}`);
      } catch (err) {
        results.push(`❌ ${item.bucket.label}: Contribution failed`);
      }
    }

    setDistributeResult(results.join('\n'));
    setTriggerConfetti(true);
    setTimeout(() => setTriggerConfetti(false), 6000);
    setDistributing(false);
  };

  // ── Modal Handlers ─────────────────────────────────────────────────────────

  const handleOpenModal = (goal?: SavingsGoal) => {
    if (goal) {
      setEditingGoal(goal);
      const dateStr = typeof goal.deadline === 'string' 
        ? goal.deadline.split('T')[0] 
        : (goal.deadline as Date).toISOString().split('T')[0];

      setFormData({
        name: goal.name,
        targetAmount: goal.targetAmount.toString(),
        currentAmount: goal.currentAmount.toString(),
        deadline: dateStr,
        color: goal.color,
      });
    } else {
      setEditingGoal(null);
      setFormData({
        name: '',
        targetAmount: '',
        currentAmount: '0',
        deadline: '',
        color: '#2ecc71',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGoal(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const goalData = {
        name: formData.name,
        targetAmount: parseFloat(formData.targetAmount),
        currentAmount: parseFloat(formData.currentAmount) || 0,
        deadline: new Date(formData.deadline).toISOString(),
        color: formData.color,
      };

      if (editingGoal) {
        await updateGoal({ ...goalData, id: editingGoal.id });
      } else {
        await addGoal(goalData);
      }
      
      handleCloseModal();
    } catch (error) {
      console.error('Error saving goal:', error);
      alert('Failed to save savings goal. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this savings goal?')) {
      try {
        await deleteGoal(id);
      } catch (error) {
        console.error('Error deleting goal:', error);
        alert('Failed to delete goal.');
      }
    }
  };

  const handleContributeOpen = (goal: SavingsGoal) => {
    const remaining = goal.targetAmount - goal.currentAmount;
    const maxAvailable = Math.max(0, netBalance);
    setActionModal({ 
      goalId: goal.id, 
      maxAmount: Math.min(remaining, maxAvailable) 
    });
    setActionAmount('');
  };

  const handleContributeSubmit = async () => {
    if (!actionModal.goalId || !actionAmount) return;

    const amount = parseFloat(actionAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const goal = goalState.goals.find(g => g.id === actionModal.goalId);
    if (!goal) return;

    try {
      await contribute(actionModal.goalId, amount);
      
      if (goal.currentAmount + amount >= goal.targetAmount) {
        setTriggerConfetti(true);
        setTimeout(() => setTriggerConfetti(false), 6000);
      }

      setActionModal({ goalId: null, maxAmount: 0 });
      setActionAmount('');
    } catch (error) {
      console.error('Error earmarking funds:', error);
      alert('Failed to earmark funds.');
    }
  };

  const getDaysRemaining = (deadlineDate: string | Date) => {
    const dDate = new Date(deadlineDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = dDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getMonthsRemaining = (deadlineDate: string | Date) => {
    const dDate = new Date(deadlineDate);
    const today = new Date();
    const diffYears = dDate.getFullYear() - today.getFullYear();
    const diffMonths = dDate.getMonth() - today.getMonth();
    return Math.max(1, diffYears * 12 + diffMonths);
  };

  const calculateRequiredMonthly = (goal: SavingsGoal) => {
    const remaining = goal.targetAmount - goal.currentAmount;
    if (remaining <= 0) return 0;
    const months = getMonthsRemaining(goal.deadline);
    return remaining / months;
  };

  return (
    <div className="savings-goals-page">
      <Confetti active={triggerConfetti} />

      <div className="page-header">
        <h2>🎯 Savings Goals</h2>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + Add New Goal
        </button>
      </div>

      {/* Net Balance Surplus Card */}
      <div className="net-balance-card">
        <div className="net-balance-info">
          <h3>Monthly Net Balance Available</h3>
          <p className="description">You can earmark part of your surplus (Income minus Expenses) toward savings goals.</p>
        </div>
        <div className="net-balance-amount">
          <span className={`value ${netBalance >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(netBalance)}
          </span>
          <span className="label">Available this month</span>
        </div>
      </div>

      {/* ── Auto-Distribute Surplus Section ───────────────────────────────────── */}
      {netBalance > 0 && (
        <div className="distribute-section">
          <div className="distribute-header">
            <div className="distribute-title">
              <span className="distribute-icon">⚡</span>
              <h3>Auto-Distribute Surplus</h3>
            </div>
            <button
              className="btn btn-primary distribute-btn"
              onClick={handleAutoDistribute}
              disabled={distributing || distribution.every(d => !d.goal)}
            >
              {distributing ? 'Distributing…' : 'Distribute Now'}
            </button>
          </div>

          <p className="distribute-subtitle">
            Your surplus of <strong>{formatCurrency(netBalance)}</strong> will be split automatically across your savings goals as follows:
          </p>

          <div className="distribute-buckets">
            {distribution.map(item => {
              const hasGoal = !!item.goal;
              return (
                <div
                  key={item.bucket.id}
                  className="distribute-bucket"
                  style={{ borderLeftColor: item.bucket.color }}
                >
                  <div className="bucket-top">
                    <span className="bucket-icon">{item.bucket.icon}</span>
                    <span className="bucket-label">{item.bucket.label}</span>
                    <span className="bucket-percent">{item.bucket.percent * 100}%</span>
                  </div>
                  <div className="bucket-amount">{formatCurrency(item.amount)}</div>
                  <div className="bucket-goal">
                    {hasGoal ? (
                      <span className="bucket-matched">→ {item.goal!.name}</span>
                    ) : (
                      <span className="bucket-unmatched">No goal found — create one containing "{item.bucket.keywords[0]}" in the name</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {surplusAfterDistribute > 0 && (
            <div className="distribute-remainder">
              <span>Remainder (due to rounding):</span>
              <strong>{formatCurrency(surplusAfterDistribute)}</strong>
            </div>
          )}

          {distributeResult && (
            <div className="distribute-result">
              <pre>{distributeResult}</pre>
            </div>
          )}
        </div>
      )}

      {goalState.error && (
        <div className="alert alert-warning">
          {goalState.error}
        </div>
      )}

      {goalState.loading ? (
        <div className="loading">Loading your goals...</div>
      ) : goalState.goals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🐷</div>
          <h3>No Savings Goals Yet</h3>
          <p>Whether it's for a holiday, car deposit, or emergency fund, start planning your goals today!</p>
          <p className="empty-tip">
            💡 <strong>Pro tip:</strong> Create goals named <em>"Emergency Fund"</em>, <em>"Short Term Goals"</em>, <em>"Medium Term Goals"</em>, and <em>"Education & Career"</em> to use the Auto-Distribute feature.
          </p>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            Create a Savings Goal
          </button>
        </div>
      ) : (
        <div className="goals-grid">
          {goalState.goals.map(goal => {
            const percentage = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
            const daysRemaining = getDaysRemaining(goal.deadline);
            const requiredMonthly = calculateRequiredMonthly(goal);
            const isCompleted = goal.currentAmount >= goal.targetAmount;

            return (
              <div key={goal.id} className={`goal-card ${isCompleted ? 'completed' : ''}`} style={{ borderTopColor: goal.color }}>
                {isCompleted && <div className="completed-badge">🎉 Completed</div>}
                
                <div className="goal-header">
                  <h3>{goal.name}</h3>
                  <div className="goal-actions">
                    <button className="btn-icon" onClick={() => handleOpenModal(goal)} title="Edit">✏️</button>
                    <button className="btn-icon" onClick={() => handleDelete(goal.id)} title="Delete">🗑️</button>
                  </div>
                </div>

                <div className="goal-body">
                  <div className="progress-container">
                    <div className="progress-labels">
                      <span className="percentage">{percentage.toFixed(0)}%</span>
                      <span className="days">
                        {daysRemaining > 0 ? `${daysRemaining} days left` : daysRemaining === 0 ? 'Deadline Today' : 'Passed Deadline'}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${percentage}%`, backgroundColor: goal.color }}
                      />
                    </div>
                  </div>

                  <div className="goal-amounts">
                    <div className="amount-item">
                      <span className="label">Saved</span>
                      <span className="value font-highlight" style={{ color: goal.color }}>
                        {formatCurrency(goal.currentAmount)}
                      </span>
                    </div>
                    <div className="amount-item">
                      <span className="label">Target</span>
                      <span className="value">{formatCurrency(goal.targetAmount)}</span>
                    </div>
                  </div>

                  {!isCompleted && (
                    <div className="goal-math">
                      <div className="math-row">
                        <span className="math-label">Required monthly:</span>
                        <span className="math-value font-highlight">
                          {formatCurrency(requiredMonthly)}/mo
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="goal-footer-buttons">
                    {!isCompleted && (
                      <button 
                        className="btn btn-sm btn-success btn-block"
                        onClick={() => handleContributeOpen(goal)}
                        disabled={netBalance <= 0}
                      >
                        🐷 Earmark Funds
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Goal Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}</h3>
              <button className="btn-close" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Goal Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Emergency Fund, Holiday, Car Deposit"
                />
                <small className="form-hint">
                  💡 For Auto-Distribute, name goals with: <em>Emergency</em>, <em>Medium</em>, <em>Short</em>, <em>Education</em> or <em>Career</em>
                </small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Target Amount *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>Current Saved Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.currentAmount}
                    onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Deadline *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Color Tag</label>
                  <input
                    type="color"
                    className="form-control color-input"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingGoal ? 'Update' : 'Create'} Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute / Earmark Modal */}
      {actionModal.goalId && (
        <div className="modal-overlay" onClick={() => setActionModal({ goalId: null, maxAmount: 0 })}>
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Earmark Monthly Surplus</h3>
              <button className="btn-close" onClick={() => setActionModal({ goalId: null, maxAmount: 0 })}>×</button>
            </div>
            <div className="modal-body">
              <p className="earmark-desc">
                Allocate up to <strong>{formatCurrency(actionModal.maxAmount)}</strong> toward this goal from your current surplus.
              </p>
              <div className="form-group">
                <label>Amount to Transfer</label>
                <input
                  type="number"
                  className="form-control"
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  min="0.01"
                  max={actionModal.maxAmount}
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
                onClick={() => setActionModal({ goalId: null, maxAmount: 0 })}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-success"
                onClick={handleContributeSubmit}
              >
                Earmark
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsGoals;