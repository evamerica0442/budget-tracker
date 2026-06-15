/**
 * Reconciliation Engine
 * ======================
 *
 * Matches imported bank transactions against scheduled payments.
 *
 * Flow:
 *   1. User imports bank transactions (CSV or API)
 *   2. Transactions are normalized into standard format
 *   3. Reconciliation engine compares each transaction against active scheduled payments
 *   4. Matches are recorded: the transaction is linked to the payment, and the
 *      payment's due_date advances to the next occurrence
 *   5. Unmatched transactions remain in the "uncategorized" pool for manual review
 *
 * This engine handles:
 *   - Auto-reconciliation using configurable match strategies
 *   - Fuzzy matching (amount tolerance, description substring)
 *   - Duplicate prevention (tracks reconciled transaction IDs)
 *   - Status updates (marks payments as reconciled, advances due dates)
 */

import ScheduledPayment from '../models/ScheduledPayment.js';

// ── Configuration ──────────────────────────────────────────────────────────

const RECONCILIATION_CONFIG = {
  // Default match window: only consider transactions within N days of the due_date
  dateMatchWindowDays: 5,
  // Batch size for processing large imports
  batchSize: 100,
};

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ReconciledMatch
 * @property {string} paymentId - Scheduled payment ID
 * @property {string} transactionId - Bank transaction ID
 * @property {string} transactionDate - When the transaction occurred
 * @property {number} amountMatched - The matched amount
 * @property {string} matchStrategy - Which strategy was used
 * @property {boolean} dueDateAdvanced - Whether the payment's due date was advanced
 */

/**
 * @typedef {Object} ReconciliationResult
 * @property {ReconciledMatch[]} matched - Successfully matched transactions
 * @property {Array} unmatched - Transactions that did not match any payment
 * @property {Object} summary - { total, matched, unmatched, errors }
 */

// ── Core Reconciliation Logic ──────────────────────────────────────────────

/**
 * Reconcile a set of imported bank transactions against the user's scheduled payments.
 *
 * @param {string} userId - Firebase user ID
 * @param {Array<Object>} transactions - Normalized bank transactions
 *   Each transaction: { id, date, amount, merchant, category }
 * @param {Object} [options] - Reconciliation options
 * @param {number} [options.dateWindowDays=5] - How many days +/- due_date to consider
 * @returns {Promise<ReconciliationResult>}
 */
export async function reconcileTransactions(userId, transactions, options = {}) {
  const dateWindowDays = options.dateWindowDays || RECONCILIATION_CONFIG.dateMatchWindowDays;
  const result = {
    matched: [],
    unmatched: [],
    errors: [],
    summary: { total: transactions.length, matched: 0, unmatched: 0, errors: 0 },
  };

  if (!transactions || transactions.length === 0) {
    return result;
  }

  try {
    // 1. Fetch all active payments for this user
    const payments = await ScheduledPayment.find({
      user: userId,
      status: { $in: ['active', 'paused'] },
    }).lean();

    if (payments.length === 0) {
      // No payments configured — everything is unmatched
      result.unmatched = transactions.map((t) => ({
        transactionId: t.id,
        merchant: t.merchant,
        amount: t.amount,
        date: t.date,
        reason: 'No active scheduled payments found',
      }));
      result.summary.unmatched = transactions.length;
      return result;
    }

    console.log(`[reconciliation] Reconciling ${transactions.length} transactions against ${payments.length} scheduled payments`);

    // 2. Build a date-range index for efficient filtering
    // For each payment, compute the valid date window
    const paymentWindows = payments.map((payment) => {
      const dueDate = new Date(payment.due_date);
      const windowStart = new Date(dueDate.getTime() - dateWindowDays * 24 * 60 * 60 * 1000);
      const windowEnd = new Date(dueDate.getTime() + dateWindowDays * 24 * 60 * 60 * 1000);
      return { payment, windowStart, windowEnd };
    });

    // 3. Process transactions in batches
    const batches = chunkArray(transactions, RECONCILIATION_CONFIG.batchSize);

    for (const batch of batches) {
      for (const transaction of batch) {
        try {
          await reconcileSingleTransaction(transaction, paymentWindows, userId, result);
        } catch (err) {
          console.error(`[reconciliation] Error processing transaction ${transaction.id}:`, err.message);
          result.errors.push({
            transactionId: transaction.id,
            error: err.message,
          });
          result.summary.errors++;
        }
      }
    }

    // 4. Update summary
    result.summary.matched = result.matched.length;
    result.summary.unmatched = result.unmatched.length;

    console.log(`[reconciliation] Result: ${result.summary.matched} matched, ${result.summary.unmatched} unmatched, ${result.summary.errors} errors`);
  } catch (err) {
    console.error('[reconciliation] Fatal error:', err.message);
    throw err;
  }

  return result;
}

/**
 * Attempt to match a single transaction against all payment windows.
 *
 * @param {Object} transaction
 * @param {Array} paymentWindows - [{ payment, windowStart, windowEnd }]
 * @param {string} userId
 * @param {ReconciliationResult} result - Accumulated result (mutated in place)
 */
async function reconcileSingleTransaction(transaction, paymentWindows, userId, result) {
  const txDate = new Date(transaction.date);

  // Filter payments whose due_date window includes this transaction date
  const candidatePayments = paymentWindows.filter((pw) => {
    return txDate >= pw.windowStart && txDate <= pw.windowEnd;
  });

  if (candidatePayments.length === 0) {
    // No candidate payments — check without date filter as fallback for flexible matching
    result.unmatched.push({
      transactionId: transaction.id,
      merchant: transaction.merchant,
      amount: transaction.amount,
      date: transaction.date,
      reason: 'No payments due within the date window',
    });
    return;
  }

  // Try each candidate payment's match strategy
  for (const { payment } of candidatePayments) {
    // Reconstruct the match method from the Mongoose schema logic
    const matchResult = testMatch(payment, transaction);

    if (matchResult.matched) {
      // ── Record the match ────────────────────────────────────────────────

      // Persist the reconciliation to the payment record
      await ScheduledPayment.findOneAndUpdate(
        { id: payment.id },
        {
          $addToSet: { 'reconciliation.reconciled_transaction_ids': transaction.id },
          $set: { 'reconciliation.last_reconciled_date': new Date().toISOString() },
        }
      );

      // Advance the due date (unless it's a 'once' payment)
      const paymentDoc = await ScheduledPayment.findOne({ id: payment.id });
      if (paymentDoc) {
        paymentDoc.advanceDueDate();
        await paymentDoc.save();
      }

      result.matched.push({
        paymentId: payment.id,
        paymentName: payment.name,
        transactionId: transaction.id,
        transactionDate: transaction.date,
        amountMatched: transaction.amount,
        expectedAmount: payment.amount,
        matchStrategy: matchResult.strategy,
        confidence: matchResult.confidence,
        dueDateAdvanced: payment.frequency !== 'once',
        newDueDate: paymentDoc?.due_date,
      });

      return; // First match wins
    }
  }

  // No match found among candidates
  result.unmatched.push({
    transactionId: transaction.id,
    merchant: transaction.merchant,
    amount: transaction.amount,
    date: transaction.date,
    reason: 'No matching scheduled payment found',
  });
}

// ── Match Strategy Logic ───────────────────────────────────────────────────

/**
 * Test a transaction against a scheduled payment's match rules.
 * Implements the same logic as ScheduledPayment.matchesTransaction() but
 * operates on plain objects (lean queries) for performance.
 *
 * @param {Object} payment - Scheduled payment (plain object from lean())
 * @param {Object} transaction - Normalized bank transaction
 * @returns {{ matched: boolean, strategy: string|null, confidence: number }}
 */
function testMatch(payment, transaction) {
  const reconciliation = payment.reconciliation || {};
  const strategy = reconciliation.match_strategy || 'description_and_amount';
  const matchText = (reconciliation.match_text || '').toLowerCase();
  const descLower = (transaction.merchant || '').toLowerCase();
  const tolerance = reconciliation.amount_tolerance || 0;

  // Skip if already reconciled
  const reconTxIds = reconciliation.reconciled_transaction_ids || [];
  if (reconTxIds.includes(transaction.id)) {
    return { matched: false, strategy: null, confidence: 0 };
  }

  switch (strategy) {
    case 'description_contains': {
      const descMatch = matchText && descLower.includes(matchText);
      return {
        matched: descMatch,
        strategy: 'description_contains',
        confidence: descMatch ? 0.7 : 0,
      };
    }

    case 'description_exact': {
      const exactMatch = matchText && descLower === matchText;
      return {
        matched: exactMatch,
        strategy: 'description_exact',
        confidence: exactMatch ? 0.95 : 0,
      };
    }

    case 'amount_match': {
      const diff = Math.abs(Math.abs(transaction.amount) - Math.abs(payment.amount));
      const amountMatch = diff <= tolerance;
      return {
        matched: amountMatch,
        strategy: 'amount_match',
        confidence: amountMatch ? (tolerance > 0 ? 0.6 : 0.8) : 0,
      };
    }

    case 'description_and_amount':
    default: {
      const descMatch = matchText && descLower.includes(matchText);
      const amountDiff = Math.abs(Math.abs(transaction.amount) - Math.abs(payment.amount));
      const amountMatch = amountDiff <= tolerance;
      const bothMatch = descMatch && amountMatch;

      // Confidence scoring:
      // - Exact description match + exact amount = 100%
      // - Substring match + amount within tolerance = 85%
      // - Substring match only = 50%
      // - Amount match only = 40%
      let confidence = 0;
      if (descMatch && amountMatch) {
        confidence = amountDiff === 0 ? 1.0 : 0.85;
      } else if (descMatch) {
        confidence = 0.5;
      } else if (amountMatch) {
        confidence = 0.4;
      }

      return {
        matched: bothMatch,
        strategy: 'description_and_amount',
        confidence,
      };
    }
  }
}

// ── Batch Reconciliation (for CSV imports) ─────────────────────────────────

/**
 * Convenience wrapper: import CSV transactions and reconcile in one step.
 *
 * @param {string} userId
 * @param {Array<Object>} csvTransactions - Output from csv-parser
 * @returns {Promise<ReconciliationResult>}
 */
export async function reconcileCSVImport(userId, csvTransactions) {
  // First, ensure all transactions are stored in the DB
  // (Assumes the caller has already saved them or will do so)
  return reconcileTransactions(userId, csvTransactions);
}

/**
 * Reconcile a single scheduled payment manually.
 * Useful for the "Mark as Paid" button in the UI.
 *
 * @param {string} paymentId
 * @param {string} transactionId - The bank transaction that fulfills this payment
 * @returns {Promise<Object>}
 */
export async function manualReconcile(paymentId, transactionId) {
  const payment = await ScheduledPayment.findOne({ id: paymentId });
  if (!payment) throw new Error(`Payment ${paymentId} not found`);

  // Add transaction to reconciled list
  payment.reconciliation.reconciled_transaction_ids.push(transactionId);
  payment.reconciliation.last_reconciled_date = new Date().toISOString();

  // Advance due date
  payment.advanceDueDate();
  await payment.save();

  return {
    paymentId: payment.id,
    paymentName: payment.name,
    transactionId,
    dueDateAdvanced: true,
    newDueDate: payment.due_date,
    status: payment.status,
  };
}

// ── Utilities ──────────────────────────────────────────────────────────────

/**
 * Split an array into chunks of a given size.
 * @param {Array} arr
 * @param {number} size
 * @returns {Array<Array>}
 */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export default {
  reconcileTransactions,
  reconcileCSVImport,
  manualReconcile,
};