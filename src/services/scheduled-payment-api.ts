/**
 * Scheduled Payments API Service
 * 
 * CRUD + reconciliation + reminder endpoints for scheduled payments.
 */
import { ScheduledPayment, ReconciliationSummary } from '../types/scheduled-payment';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const savedUser = localStorage.getItem('budget_user');
  const token = savedUser ? JSON.parse(savedUser).token : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || `API Error: ${response.status}`);
  }

  return data as T;
}

export interface CreateScheduledPaymentData {
  name: string;
  amount: number;
  frequency: string;
  due_date: string;
  category: string;
  currency?: string;
  end_date?: string;
  linked_account?: string;
  status?: string;
  reminders?: {
    days_before?: number[];
    channels?: string[];
    missed_alert?: boolean;
  };
  reconciliation?: {
    match_strategy?: string;
    match_text?: string;
    amount_tolerance?: number;
  };
}

export interface CSVImportResult {
  imported: number;
  bank: string;
  transactions: Array<{
    id: string;
    date: string;
    amount: number;
    merchant: string;
    category: string;
    source: string;
  }>;
  reconciliation: {
    matched: Array<{
      paymentId: string;
      paymentName: string;
      transactionId: string;
      matchStrategy: string;
      confidence: number;
    }>;
    unmatched: Array<{
      transactionId: string;
      merchant: string;
      reason: string;
    }>;
    summary: { total: number; matched: number; unmatched: number };
  };
}

export interface ReminderResult {
  sent: number;
  failed: number;
  details: { sent: Array<any>; failed: Array<any> };
  timestamp: string;
}

export const scheduledPaymentAPI = {
  /** List all scheduled payments (optional status filter / upcoming filter) */
  getAll: (params?: { status?: string; upcoming?: boolean; days?: number }): Promise<ScheduledPayment[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.upcoming) query.append('upcoming', 'true');
    if (params?.days) query.append('days', String(params.days));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiCall<ScheduledPayment[]>(`/scheduled-payments${qs}`);
  },

  /** Get a single scheduled payment */
  getById: (id: string): Promise<ScheduledPayment> =>
    apiCall<ScheduledPayment>(`/scheduled-payments/${id}`),

  /** Create a new scheduled payment */
  create: (data: CreateScheduledPaymentData): Promise<ScheduledPayment> =>
    apiCall<ScheduledPayment>('/scheduled-payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update an existing payment */
  update: (id: string, data: Partial<CreateScheduledPaymentData>): Promise<ScheduledPayment> =>
    apiCall<ScheduledPayment>(`/scheduled-payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Soft-delete (archive) a payment */
  delete: (id: string): Promise<{ message: string; id: string }> =>
    apiCall(`/scheduled-payments/${id}`, { method: 'DELETE' }),

  /** Import CSV and auto-reconcile */
  importCSV: (csvData: string, bank?: string): Promise<CSVImportResult> =>
    apiCall<CSVImportResult>('/scheduled-payments/import/csv', {
      method: 'POST',
      body: JSON.stringify({ csvData, bank }),
    }),

  /** Manually reconcile a payment with a transaction */
  reconcile: (paymentId: string, transactionId: string): Promise<any> =>
    apiCall(`/scheduled-payments/${paymentId}/reconcile`, {
      method: 'POST',
      body: JSON.stringify({ transactionId }),
    }),

  /** Trigger reminder processing */
  processReminders: (): Promise<ReminderResult> =>
    apiCall<ReminderResult>('/scheduled-payments/reminders/process', { method: 'POST' }),

  /** Send a manual reminder for a specific payment */
  sendReminder: (paymentId: string): Promise<any> =>
    apiCall(`/scheduled-payments/${paymentId}/remind`, { method: 'POST' }),

  /** Get reconciliation summary */
  getReconciliationSummary: (): Promise<ReconciliationSummary> =>
    apiCall<ReconciliationSummary>('/scheduled-payments/reconciliation/summary'),
};

export default scheduledPaymentAPI;