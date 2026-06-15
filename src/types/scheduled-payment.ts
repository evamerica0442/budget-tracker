/**
 * Scheduled Payment Type Definitions
 * 
 * Mirrors the backend Mongoose schema for scheduled/recurring payments:
 * RA contributions, debit orders, utilities, subscriptions, etc.
 */

export interface ScheduledPayment {
  id: string;
  name: string;
  amount: number;
  currency: 'ZAR' | 'USD' | 'GBP' | 'EUR';
  frequency: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannually' | 'annually';
  due_date: string;
  end_date: string | null;
  category: ScheduledPaymentCategory;
  linked_account: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'archived';
  reminders: {
    days_before: number[];
    channels: ('email' | 'push' | 'sms')[];
    missed_alert: boolean;
  };
  reconciliation: {
    match_strategy: 'description_contains' | 'description_exact' | 'amount_match' | 'description_and_amount';
    match_text: string;
    amount_tolerance: number;
    reconciled_transaction_ids: string[];
    last_reconciled_date: string | null;
  };
  user: string;
  createdAt: string;
  updatedAt: string;
}

export type ScheduledPaymentCategory =
  | 'housing'
  | 'utilities'
  | 'insurance'
  | 'medical_aid'
  | 'retirement_annuity'
  | 'investments'
  | 'savings'
  | 'debt_repayment'
  | 'subscriptions'
  | 'education'
  | 'transport'
  | 'food'
  | 'entertainment'
  | 'other';

export type ScheduledPaymentFrequency =
  | 'once' | 'daily' | 'weekly' | 'biweekly'
  | 'monthly' | 'quarterly' | 'biannually' | 'annually';

export type ScheduledPaymentStatus =
  | 'active' | 'paused' | 'completed' | 'cancelled' | 'archived';

export const FREQUENCY_LABELS: Record<ScheduledPaymentFrequency, string> = {
  once: 'One-time',
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannually: 'Bi-annually',
  annually: 'Annually',
};

export const CATEGORY_LABELS: Record<ScheduledPaymentCategory, string> = {
  housing: 'Housing / Bond',
  utilities: 'Utilities (Eskom, Water)',
  insurance: 'Insurance',
  medical_aid: 'Medical Aid',
  retirement_annuity: 'Retirement Annuity',
  investments: 'Investments',
  savings: 'Savings',
  debt_repayment: 'Debt Repayment',
  subscriptions: 'Subscriptions (DStv, Netflix)',
  education: 'Education',
  transport: 'Transport',
  food: 'Food / Groceries',
  entertainment: 'Entertainment',
  other: 'Other',
};

export const STATUS_LABELS: Record<ScheduledPaymentStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
  archived: 'Archived',
};

export interface ReconciliationSummary {
  total: number;
  overdue: number;
  reconciled: number;
  payments: Array<{
    id: string;
    name: string;
    amount: number;
    frequency: string;
    dueDate: string;
    status: string;
    daysUntilDue: number;
    reconciled: number;
    lastReconciled: string | null;
    isOverdue: boolean;
  }>;
}