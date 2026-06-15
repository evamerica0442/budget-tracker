import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Scheduled Payment Schema (South African Budget Tracker)
 *
 * Stores recurring/planned payments such as:
 * - Retirement Annuity (RA) contributions
 * - Medical aid premiums
 * - Debit orders (insurance, loan repayments)
 * - Utility bills (municipality, Eskom, water)
 * - Subscription services (Netflix, DStv, Showmax)
 *
 * POPIA Compliance:
 * - personalDataConsent: Explicit consent record for storing payment data
 * - AES-256 encryption handled at application layer before DB insertion
 * - Data retention controlled via status lifecycle (active → archived → purged)
 */
const scheduledPaymentSchema = new mongoose.Schema({
  /** Unique identifier */
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    immutable: true
  },

  /** Human-readable label (e.g. "Old Mutual RA", "Momentum Medical Aid") */
  name: {
    type: String,
    required: [true, 'Payment name is required'],
    trim: true,
    maxlength: [128, 'Name cannot exceed 128 characters']
  },

  /** Payment amount in ZAR (cents precision via integer, but stored as Number for simplicity) */
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount cannot be negative'],
    validate: {
      validator: (v) => v > 0,
      message: 'Amount must be greater than 0'
    }
  },

  /** ISO 4217 currency code — default ZAR for South African users */
  currency: {
    type: String,
    default: 'ZAR',
    enum: ['ZAR', 'USD', 'GBP', 'EUR'],
    uppercase: true
  },

  /** Payment frequency for scheduling */
  frequency: {
    type: String,
    required: [true, 'Frequency is required'],
    enum: {
      values: [
        'once',           // Single payment
        'daily',          // Every day
        'weekly',         // Every 7 days
        'biweekly',       // Every 14 days / twice a month
        'monthly',        // Every calendar month
        'quarterly',      // Every 3 months
        'biannually',     // Every 6 months
        'annually'        // Once per year
      ],
      message: '{VALUE} is not a supported frequency'
    }
  },

  /**
   * Due date for the next occurrence.
   * For recurring payments, this is the *next* due date.
   * After reconciliation, this advances by frequency period.
   */
  due_date: {
    type: Date,
    required: [true, 'Due date is required']
  },

  /** End date for recurring payments (null = indefinite / ongoing) */
  end_date: {
    type: Date,
    default: null
  },

  /** Category mapping for budget reporting */
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'housing',
      'utilities',
      'insurance',
      'medical_aid',
      'retirement_annuity',
      'investments',
      'savings',
      'debt_repayment',
      'subscriptions',
      'education',
      'transport',
      'food',
      'entertainment',
      'other'
    ]
  },

  /** Linked bank account reference (IBAN-style or internal account UUID) */
  linked_account: {
    type: String,
    default: '',
    trim: true
  },

  /** Payment lifecycle status */
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled', 'archived'],
    default: 'active',
    index: true
  },

  /** Reminder configuration */
  reminders: {
    /** Days before due_date to trigger reminders */
    days_before: {
      type: [Number],
      default: [7, 3, 1], // 1 week, 3 days, 1 day before
      validate: {
        validator: (v) => Array.isArray(v) && v.every((d) => Number.isInteger(d) && d >= 0),
        message: 'days_before must be an array of non-negative integers'
      }
    },
    /** Channels for delivering the reminder */
    channels: {
      type: [String],
      default: ['email'],
      enum: ['email', 'push', 'sms']
    },
    /** Whether to send a missed-payment alert if due_date passes unreconciled */
    missed_alert: {
      type: Boolean,
      default: true
    }
  },

  /** Auto-reconciliation rules */
  reconciliation: {
    /**
     * Strategy for matching this payment to imported transactions:
     * - 'description_contains': Match if any transaction description contains `match_text`
     * - 'description_exact':    Exact match on transaction description
     * - 'amount_match':         Match by amount (within tolerance)
     * - 'description_and_amount': Both description pattern AND amount must match (recommended)
     */
    match_strategy: {
      type: String,
      enum: ['description_contains', 'description_exact', 'amount_match', 'description_and_amount'],
      default: 'description_and_amount'
    },
    /** Text or regex pattern to search for in transaction descriptions */
    match_text: {
      type: String,
      default: '',
      trim: true
    },
    /** Amount tolerance in ZAR (e.g. 5.00 allows matching 495 vs 500 for bank fees) */
    amount_tolerance: {
      type: Number,
      default: 0,
      min: 0
    },
    /**
     * Previously reconciled transaction IDs.
     * Used to prevent duplicate reconciliation of the same bank transaction.
     */
    reconciled_transaction_ids: {
      type: [String],
      default: []
    },
    /** Last reconciled date (null if never reconciled) */
    last_reconciled_date: {
      type: Date,
      default: null
    }
  },

  /** POPIA: Timestamp when user consented to storing this payment data */
  personal_data_consent_at: {
    type: Date,
    default: Date.now
  },

  /** Firestore user association (string ID, not ObjectId, for cross-DB compatibility) */
  user: {
    type: String,
    required: [true, 'User ID is required'],
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ── Indexes ────────────────────────────────────────────────────────────────

/** Efficient querying by user + status */
scheduledPaymentSchema.index({ user: 1, status: 1 });

/** Find upcoming due payments for reminder generation */
scheduledPaymentSchema.index({ due_date: 1, status: 1 });

// ── Virtual Fields ─────────────────────────────────────────────────────────

/** Days remaining until the next due date */
scheduledPaymentSchema.virtual('days_until_due').get(function () {
  if (!this.due_date) return null;
  const now = new Date();
  const due = new Date(this.due_date);
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

/** Whether the payment is overdue (past due and not reconciled) */
scheduledPaymentSchema.virtual('is_overdue').get(function () {
  if (!this.due_date || this.status !== 'active') return false;
  return new Date(this.due_date) < new Date();
});

// ── Instance Methods ───────────────────────────────────────────────────────

/**
 * Advance the due_date to the next occurrence based on frequency.
 * Call this after a successful reconciliation.
 */
scheduledPaymentSchema.methods.advanceDueDate = function () {
  if (this.status === 'completed' || this.status === 'cancelled') return;

  const current = new Date(this.due_date);

  switch (this.frequency) {
    case 'once':
      this.status = 'completed';
      return;
    case 'daily':
      current.setDate(current.getDate() + 1);
      break;
    case 'weekly':
      current.setDate(current.getDate() + 7);
      break;
    case 'biweekly':
      current.setDate(current.getDate() + 14);
      break;
    case 'monthly':
      current.setMonth(current.getMonth() + 1);
      break;
    case 'quarterly':
      current.setMonth(current.getMonth() + 3);
      break;
    case 'biannually':
      current.setMonth(current.getMonth() + 6);
      break;
    case 'annually':
      current.setFullYear(current.getFullYear() + 1);
      break;
  }

  // Check if we've passed the end_date
  if (this.end_date && current > new Date(this.end_date)) {
    this.status = 'completed';
    return;
  }

  this.due_date = current;
};

/**
 * Check if a bank transaction can be reconciled against this payment.
 * @param {Object} transaction - Normalized bank transaction { date, amount, description, ... }
 * @returns {boolean}
 */
scheduledPaymentSchema.methods.matchesTransaction = function (transaction) {
  const { date, amount, description } = transaction;

  // Skip if already reconciled
  if (this.reconciliation.reconciled_transaction_ids.includes(transaction.id)) {
    return false;
  }

  const strategy = this.reconciliation.match_strategy;
  const matchText = this.reconciliation.match_text?.toLowerCase() || '';
  const descLower = (description || '').toLowerCase();
  const tolerance = this.reconciliation.amount_tolerance || 0;

  switch (strategy) {
    case 'description_contains':
      return matchText && descLower.includes(matchText);

    case 'description_exact':
      return matchText && descLower === matchText;

    case 'amount_match': {
      const diff = Math.abs(amount - this.amount);
      return diff <= tolerance;
    }

    case 'description_and_amount': {
      const descMatch = matchText && descLower.includes(matchText);
      const amountDiff = Math.abs(amount - this.amount);
      return descMatch && amountDiff <= tolerance;
    }

    default:
      return false;
  }
};

// ── Statics ────────────────────────────────────────────────────────────────

/**
 * Find all scheduled payments due for reminder generation.
 * @param {Date} [asOf=new Date()] - Reference date
 * @returns {Promise<Array>}
 */
scheduledPaymentSchema.statics.findPaymentsDueForReminder = async function (asOf = new Date()) {
  const lookaheadDays = 7; // Check the next 7 days
  const endDate = new Date(asOf.getTime() + lookaheadDays * 24 * 60 * 60 * 1000);

  return this.find({
    status: 'active',
    due_date: {
      $gte: asOf,
      $lte: endDate
    }
  }).lean();
};

/**
 * Find overdue payments that need a missed-payment alert.
 * @returns {Promise<Array>}
 */
scheduledPaymentSchema.statics.findOverduePayments = async function () {
  return this.find({
    status: 'active',
    due_date: { $lt: new Date() },
    'reminders.missed_alert': true
  }).lean();
};

const ScheduledPayment = mongoose.model('ScheduledPayment', scheduledPaymentSchema);

export default ScheduledPayment;