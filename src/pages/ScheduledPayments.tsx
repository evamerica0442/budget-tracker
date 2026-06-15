import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '../utils/formatting';
import scheduledPaymentAPI, { CreateScheduledPaymentData, CSVImportResult } from '../services/scheduled-payment-api';
import {
  ScheduledPayment,
  FREQUENCY_LABELS,
  CATEGORY_LABELS,
  STATUS_LABELS,
  ScheduledPaymentCategory,
  ScheduledPaymentFrequency,
} from '../types/scheduled-payment';
import '../styles/ScheduledPayments.css';

type ModalMode = 'create' | 'edit' | 'import' | null;

const INITIAL_FORM: CreateScheduledPaymentData = {
  name: '',
  amount: 0,
  frequency: 'monthly',
  due_date: '',
  category: 'other',
  currency: 'ZAR',
  reminders: { days_before: [7, 3, 1], channels: ['email'], missed_alert: true },
  reconciliation: { match_strategy: 'description_and_amount', match_text: '', amount_tolerance: 0 },
};

const ScheduledPayments: React.FC = () => {
  const [payments, setPayments] = useState<ScheduledPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [form, setForm] = useState<CreateScheduledPaymentData>({ ...INITIAL_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [csvData, setCsvData] = useState('');
  const [csvBank, setCsvBank] = useState('');
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await scheduledPaymentAPI.getAll({ status: statusFilter });
      setPayments(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const openCreate = () => {
    setForm({ ...INITIAL_FORM, due_date: new Date().toISOString().split('T')[0] });
    setEditingId(null);
    setModalMode('create');
  };

  const openEdit = (p: ScheduledPayment) => {
    setForm({
      name: p.name,
      amount: p.amount,
      frequency: p.frequency,
      due_date: p.due_date.split('T')[0],
      category: p.category,
      currency: p.currency,
      end_date: p.end_date?.split('T')[0] || '',
      linked_account: p.linked_account,
      reminders: { ...p.reminders },
      reconciliation: { ...p.reconciliation },
    });
    setEditingId(p.id);
    setModalMode('create');
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await scheduledPaymentAPI.update(editingId, form);
      } else {
        await scheduledPaymentAPI.create(form);
      }
      setModalMode(null);
      fetchPayments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Archive this scheduled payment?')) return;
    try {
      await scheduledPaymentAPI.delete(id);
      fetchPayments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleImportCSV = async () => {
    if (!csvData.trim()) { alert('Paste CSV data first'); return; }
    try {
      const result = await scheduledPaymentAPI.importCSV(csvData, csvBank || undefined);
      setImportResult(result);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendReminder = async (id: string) => {
    try {
      const result = await scheduledPaymentAPI.sendReminder(id);
      const channels = result.results?.map((r: any) => r.channel).join(', ') || 'OK';
      alert(`Reminder sent via: ${channels}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const daysUntilDue = (dueDate: string) => {
    const diff = new Date(dueDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusClass = (p: ScheduledPayment) => {
    if (p.status !== 'active') return p.status;
    const d = daysUntilDue(p.due_date);
    if (d < 0) return 'overdue';
    if (d <= 3) return 'due-soon';
    return 'active';
  };

  return (
    <div className="scheduled-payments-page">
      <div className="page-header">
        <h1>📅 Scheduled Payments</h1>
        <p className="page-subtitle">
          Track RA contributions, debit orders, utilities & subscriptions
        </p>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="summary-cards">
        <div className="summary-card active">
          <span className="summary-label">Active</span>
          <span className="summary-value">{payments.filter(p => p.status === 'active').length}</span>
        </div>
        <div className="summary-card overdue">
          <span className="summary-label">Overdue</span>
          <span className="summary-value">
            {payments.filter(p => p.status === 'active' && daysUntilDue(p.due_date) < 0).length}
          </span>
        </div>
        <div className="summary-card upcoming">
          <span className="summary-label">Due in 7 days</span>
          <span className="summary-value">
            {payments.filter(p => p.status === 'active' && daysUntilDue(p.due_date) >= 0 && daysUntilDue(p.due_date) <= 7).length}
          </span>
        </div>
        <div className="summary-card total">
          <span className="summary-label">Monthly Total</span>
          <span className="summary-value">
            {formatCurrency(
              payments
                .filter(p => p.status === 'active' && p.frequency === 'monthly')
                .reduce((sum, p) => sum + p.amount, 0)
            )}
          </span>
        </div>
      </div>

      <div className="actions-bar">
        <div className="filter-group">
          <label>Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="">All</option>
          </select>
        </div>
        <div className="actions-group">
          <button className="btn btn-primary" onClick={openCreate}>+ Add Payment</button>
          <button className="btn btn-secondary" onClick={() => { setModalMode('import'); setImportResult(null); setCsvData(''); }}>
            📄 Import CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading payments...</div>
      ) : payments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No scheduled payments yet</h3>
          <p>Add your recurring payments like RA contributions, medical aid, or debit orders.</p>
          <button className="btn btn-primary" onClick={openCreate}>Create Your First Payment</button>
        </div>
      ) : (
        <div className="payments-list">
          {payments.map((payment: ScheduledPayment) => (
            <div key={payment.id} className={`payment-card ${getStatusClass(payment)}`}>
              <div className="payment-main">
                <div className="payment-header">
                  <h3>{payment.name}</h3>
                  <span className={`status-badge status-${payment.status}`}>
                    {STATUS_LABELS[payment.status as keyof typeof STATUS_LABELS]}
                  </span>
                </div>
                <div className="payment-details">
                  <div className="detail-item">
                    <span className="detail-label">Amount</span>
                    <span className="detail-value amount">{formatCurrency(payment.amount)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Frequency</span>
                    <span className="detail-value">{FREQUENCY_LABELS[payment.frequency]}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Category</span>
                    <span className="detail-value">{CATEGORY_LABELS[payment.category]}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Due Date</span>
                    <span className={`detail-value ${daysUntilDue(payment.due_date) < 0 ? 'text-danger' : ''}`}>
                      {new Date(payment.due_date).toLocaleDateString('en-ZA')}
                      <span className="days-badge">
                        {daysUntilDue(payment.due_date) < 0
                          ? `${Math.abs(daysUntilDue(payment.due_date))} days overdue`
                          : daysUntilDue(payment.due_date) === 0
                            ? 'Due today'
                            : `${daysUntilDue(payment.due_date)} days`}
                      </span>
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Matched</span>
                    <span className="detail-value">
                      {payment.reconciliation.reconciled_transaction_ids.length} transactions
                    </span>
                  </div>
                </div>
                {payment.linked_account && (
                  <div className="payment-account">🏦 {payment.linked_account}</div>
                )}
              </div>
              <div className="payment-actions">
                <button className="btn btn-sm btn-outline" onClick={() => openEdit(payment)}>Edit</button>
                <button className="btn btn-sm btn-outline" onClick={() => handleSendReminder(payment.id)}>🔔 Remind</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(payment.id)}>Archive</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create/Edit Modal ──────────────────────────────────────────── */}
      {modalMode === 'create' && (
        <div className="modal-overlay" onClick={() => setModalMode(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Payment' : 'New Scheduled Payment'}</h2>
              <button className="modal-close" onClick={() => setModalMode(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Payment Name *</label>
                <input
                  type="text" placeholder="e.g. Old Mutual RA"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount (ZAR) *</label>
                  <input
                    type="number" min={0} step="0.01"
                    value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>Currency</label>
                  <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                    <option value="ZAR">ZAR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Frequency *</label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value as ScheduledPaymentFrequency })}
                  >
                    {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as ScheduledPaymentCategory })}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Next Due Date *</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date (optional)</label>
                  <input
                    type="date"
                    value={form.end_date || ''}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Linked Account (optional)</label>
                <input
                  type="text" placeholder="e.g. FNB Cheque 123456"
                  value={form.linked_account || ''}
                  onChange={(e) => setForm({ ...form, linked_account: e.target.value })}
                />
              </div>
              <h3 className="section-title">Reconciliation Rules</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Match Strategy</label>
                  <select
                    value={form.reconciliation?.match_strategy || 'description_and_amount'}
                    onChange={(e) => setForm({
                      ...form,
                      reconciliation: { ...form.reconciliation!, match_strategy: e.target.value }
                    })}
                  >
                    <option value="description_and_amount">Description + Amount</option>
                    <option value="description_contains">Description Contains</option>
                    <option value="description_exact">Description Exact</option>
                    <option value="amount_match">Amount Only</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Match Text</label>
                  <input
                    type="text" placeholder="e.g. OLD MUTUAL"
                    value={form.reconciliation?.match_text || ''}
                    onChange={(e) => setForm({
                      ...form,
                      reconciliation: { ...form.reconciliation!, match_text: e.target.value }
                    })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Amount Tolerance (ZAR)</label>
                <input
                  type="number" min={0} step="0.01"
                  value={form.reconciliation?.amount_tolerance || 0}
                  onChange={(e) => setForm({
                    ...form,
                    reconciliation: { ...form.reconciliation!, amount_tolerance: parseFloat(e.target.value) || 0 }
                  })}
                />
                <span className="form-hint">Allowed deviation for matching (e.g. R5 for bank fees)</span>
              </div>
              <h3 className="section-title">Reminders</h3>
              <div className="form-group">
                <label>Days before due date to remind</label>
                <div className="checkbox-group">
                  {[14, 7, 3, 1, 0].map((day) => (
                    <label key={day} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={(form.reminders?.days_before || []).includes(day)}
                        onChange={(e) => {
                          const current = form.reminders?.days_before || [];
                          const updated = e.target.value
                            ? [...current, day]
                            : current.filter((d: number) => d !== day);
                          setForm({ ...form, reminders: { ...form.reminders!, days_before: updated } });
                        }}
                      />
                      {day === 0 ? 'Due date' : `${day} days before`}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Notification Channels</label>
                <div className="checkbox-group">
                  {['email', 'push', 'sms'].map((ch) => (
                    <label key={ch} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={(form.reminders?.channels || []).includes(ch)}
                        onChange={(e) => {
                          const current = form.reminders?.channels || [];
                          const updated = e.target.checked
                            ? [...current, ch]
                            : current.filter((c: string) => c !== ch);
                          setForm({ ...form, reminders: { ...form.reminders!, channels: updated } });
                        }}
                      />
                      {ch.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.reminders?.missed_alert !== false}
                  onChange={(e) => setForm({
                    ...form,
                    reminders: { ...form.reminders!, missed_alert: e.target.checked }
                  })}
                />
                Send alert if payment becomes overdue
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalMode(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingId ? 'Update Payment' : 'Create Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CSV Import Modal ───────────────────────────────────────────── */}
      {modalMode === 'import' && (
        <div className="modal-overlay" onClick={() => setModalMode(null)}>
          <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📄 Import Bank CSV</h2>
              <button className="modal-close" onClick={() => setModalMode(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Bank (optional — leave blank for auto-detect)</label>
                <select value={csvBank} onChange={(e) => setCsvBank(e.target.value)}>
                  <option value="">Auto-detect</option>
                  <option value="fnb">FNB</option>
                  <option value="absa">ABSA</option>
                  <option value="capitec">Capitec</option>
                  <option value="nedbank">Nedbank</option>
                  <option value="standardbank">Standard Bank</option>
                </select>
              </div>
              <div className="form-group">
                <label>Paste CSV Data</label>
                <textarea
                  rows={10}
                  placeholder="Paste your bank statement CSV here..."
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={handleImportCSV} disabled={!csvData.trim()}>
                Import & Reconcile
              </button>

              {importResult && (
                <div className="import-result">
                  <h3>Import Results</h3>
                  <p>Imported <strong>{importResult.imported}</strong> transactions from <strong>{importResult.bank}</strong></p>
                  <div className="result-stats">
                    <div className="stat">
                      <span className="stat-number green">{importResult.reconciliation.summary.matched}</span>
                      <span>Matched</span>
                    </div>
                    <div className="stat">
                      <span className="stat-number orange">{importResult.reconciliation.summary.unmatched}</span>
                      <span>Unmatched</span>
                    </div>
                  </div>
                  {importResult.reconciliation.matched.length > 0 && (
                    <div className="matched-list">
                      <h4>✅ Matched Payments</h4>
                      <ul>
                        {importResult.reconciliation.matched.map((m, i) => (
                          <li key={i}>{m.paymentName} — confidence: {(m.confidence * 100).toFixed(0)}%</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledPayments;