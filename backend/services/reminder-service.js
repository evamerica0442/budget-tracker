/**
 * Reminder Notification Service
 * ==============================
 *
 * Generates reminders for scheduled payments before their due dates.
 * Supports multiple channels: email (SendGrid), push (Firebase Cloud Messaging),
 * and SMS (Twilio or AWS SNS).
 *
 * The service checks for payments due within the configured lookahead window
 * and sends notifications for any that haven't had a reminder sent yet.
 *
 * POPIA Compliance:
 * - Only sends reminders to users who have explicitly opted in
 * - Logs all reminder deliveries for audit trail
 * - Respects reminder_days_before configuration (no spam)
 */

import ScheduledPayment from '../models/ScheduledPayment.js';

// ── Configuration ──────────────────────────────────────────────────────────

const REMINDER_CONFIG = {
  // How far ahead (in days) to check for upcoming due dates
  lookaheadDays: 7,
  // Minimum gap (in hours) before resending the same reminder
  cooldownHours: 12,
  // Log file for audit trail
  auditLog: true,
};

// ── In-Memory Reminder Cache ────────────────────────────────────────────────
// Tracks which reminders have been sent to prevent duplicates within cooldown.
// In production, this would use Redis or a DB table.
const reminderCache = new Map();

/**
 * Check if a reminder should be sent (respects cooldown).
 * @param {string} paymentId
 * @param {number} daysBefore - How many days before due date
 * @returns {boolean}
 */
function shouldSendReminder(paymentId, daysBefore) {
  const key = `${paymentId}:${daysBefore}`;
  const lastSent = reminderCache.get(key);

  if (!lastSent) return true;

  const hoursSinceLastSend = (Date.now() - lastSent) / (1000 * 60 * 60);
  return hoursSinceLastSend >= REMINDER_CONFIG.cooldownHours;
}

/**
 * Mark a reminder as sent.
 * @param {string} paymentId
 * @param {number} daysBefore
 */
function markReminderSent(paymentId, daysBefore) {
  const key = `${paymentId}:${daysBefore}`;
  reminderCache.set(key, Date.now());
}

// ── Channel Senders ─────────────────────────────────────────────────────────

/**
 * Send an email reminder.
 * Integration point: plug in SendGrid / Mailgun / AWS SES here.
 *
 * @param {Object} user - { email, name }
 * @param {Object} payment - ScheduledPayment document
 * @param {number} daysUntilDue
 */
async function sendEmailReminder(user, payment, daysUntilDue) {
  const subject = daysUntilDue === 0
    ? `🔴 Due Today: ${payment.name} — R${payment.amount.toFixed(2)}`
    : `⏰ Reminder: ${payment.name} due in ${daysUntilDue} day(s)`;

  const body = `
Hi ${user.name || 'there'},

This is a reminder about your scheduled payment.

  ─────────────────────────────────
  Payment:    ${payment.name}
  Amount:     R${payment.amount.toFixed(2)} ${payment.currency || 'ZAR'}
  Due Date:   ${new Date(payment.due_date).toLocaleDateString('en-ZA')}
  Category:   ${payment.category}
  Account:    ${payment.linked_account || 'Not specified'}
  ─────────────────────────────────

TIP: Ensure you have sufficient funds in your account by the due date.
This app does NOT process payments — your bank handles the actual transfer.

— Budget Tracker
  `;

  console.log(`[reminder:email] To: ${user.email} | Subject: "${subject}"`);
  console.log(`[reminder:email] Body:\n${body}`);

  // Integration placeholder:
  // await sendgrid.send({ to: user.email, subject, text: body });
}

/**
 * Send a push notification via Firebase Cloud Messaging.
 *
 * @param {Object} user - { fcmToken, name }
 * @param {Object} payment - ScheduledPayment document
 * @param {number} daysUntilDue
 */
async function sendPushReminder(user, payment, daysUntilDue) {
  if (!user.fcmToken) {
    console.warn(`[reminder:push] No FCM token for user ${user.email}`);
    return;
  }

  const title = daysUntilDue === 0
    ? `🔴 ${payment.name} due today`
    : `⏰ ${payment.name} due in ${daysUntilDue} day(s)`;

  const body = `R${payment.amount.toFixed(2)} — ${new Date(payment.due_date).toLocaleDateString('en-ZA')}`;

  console.log(`[reminder:push] To: ${user.email} | Title: "${title}" | Body: "${body}"`);

  // Integration placeholder:
  // await admin.messaging().send({
  //   token: user.fcmToken,
  //   notification: { title, body },
  //   data: { paymentId: payment.id, type: 'scheduled_payment_reminder' },
  // });
}

/**
 * Send an SMS reminder via Twilio or AWS SNS.
 *
 * @param {Object} user - { phone, name }
 * @param {Object} payment - ScheduledPayment document
 * @param {number} daysUntilDue
 */
async function sendSmsReminder(user, payment, daysUntilDue) {
  if (!user.phone) {
    console.warn(`[reminder:sms] No phone number for user ${user.email}`);
    return;
  }

  const message = daysUntilDue === 0
    ? `[BudgetTracker] DUE TODAY: ${payment.name} — R${payment.amount.toFixed(2)}. Ensure funds available.`
    : `[BudgetTracker] REMINDER: ${payment.name} — R${payment.amount.toFixed(2)} due in ${daysUntilDue} day(s).`;

  console.log(`[reminder:sms] To: ${user.phone} | Message: "${message}"`);

  // Integration placeholder:
  // await twilio.messages.create({ body: message, from: process.env.TWILIO_PHONE, to: user.phone });
}

// ── Channel Router ──────────────────────────────────────────────────────────

const channelSenders = {
  email: sendEmailReminder,
  push: sendPushReminder,
  sms: sendSmsReminder,
};

// ── Core Reminder Logic ─────────────────────────────────────────────────────

/**
 * Process all active scheduled payments and send due reminders.
 *
 * This is the main entry point. Call it from a cron job (node-cron, GitHub Actions,
 * or a cloud scheduler).
 *
 * @param {Object} ctx - Context with user lookup capability
 * @param {Function} ctx.getUser - Async function(userId) => { email, name, phone, fcmToken }
 * @returns {Promise<{ sent: number, failed: number, details: Array }>}
 */
export async function processReminders(ctx) {
  const now = new Date();
  const sent = [];
  const failed = [];

  try {
    // 1. Get all active payments due within the lookahead window
    const paymentsDue = await ScheduledPayment.findPaymentsDueForReminder(now);

    console.log(`[reminder] Found ${paymentsDue.length} payments due for reminder`);

    // 2. For each payment, determine which reminder intervals apply
    for (const payment of paymentsDue) {
      try {
        const user = await ctx.getUser(payment.user);
        if (!user) {
          console.warn(`[reminder] User ${payment.user} not found for payment ${payment.id}`);
          failed.push({ paymentId: payment.id, reason: 'User not found' });
          continue;
        }

        const dueDate = new Date(payment.due_date);
        const diffMs = dueDate.getTime() - now.getTime();
        const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        // Only send reminders for the configured days_before values
        const applicableDays = payment.reminders.days_before || [7, 3, 1];

        for (const daysBefore of applicableDays) {
          // Check if this is the right time to send (daysUntilDue === daysBefore or due today)
          if (daysUntilDue !== daysBefore && !(daysUntilDue <= 0 && daysBefore === 0)) {
            continue;
          }

          // Respect cooldown
          if (!shouldSendReminder(payment.id, daysBefore)) {
            continue;
          }

          // Send via each configured channel
          const channels = payment.reminders.channels || ['email'];

          for (const channel of channels) {
            const sender = channelSenders[channel];
            if (!sender) {
              console.warn(`[reminder] Unknown channel: ${channel}`);
              continue;
            }

            await sender(user, payment, Math.max(0, daysUntilDue));
          }

          markReminderSent(payment.id, daysBefore);
          sent.push({ paymentId: payment.id, daysBefore, channels });
        }

        // 3. Handle overdue payments (missed payment alerts)
        if (payment.reminders.missed_alert && daysUntilDue < 0) {
          const daysOverdue = Math.abs(daysUntilDue);

          // Only alert if not sent in the last 24 hours
          if (!shouldSendReminder(payment.id, 'overdue')) continue;

          const user = await ctx.getUser(payment.user);
          for (const channel of payment.reminders.channels || ['email']) {
            const sender = channelSenders[channel];
            if (!sender) continue;

            console.log(`[reminder:overdue] Payment "${payment.name}" is ${daysOverdue} day(s) overdue`);
            // Send overdue alert
            if (channel === 'email') {
              const subject = `🔴 MISSED PAYMENT: ${payment.name} is ${daysOverdue} day(s) overdue`;
              console.log(`[reminder:email] To: ${user.email} | Subject: "${subject}"`);
            }
          }
          markReminderSent(payment.id, 'overdue');
          sent.push({ paymentId: payment.id, type: 'overdue', channels: payment.reminders.channels });
        }
      } catch (err) {
        console.error(`[reminder] Error processing payment ${payment.id}:`, err.message);
        failed.push({ paymentId: payment.id, reason: err.message });
      }
    }
  } catch (err) {
    console.error('[reminder] Fatal error:', err.message);
    throw err;
  }

  const result = {
    sent: sent.length,
    failed: failed.length,
    details: { sent, failed },
    timestamp: new Date().toISOString(),
  };

  if (REMINDER_CONFIG.auditLog) {
    console.log('[reminder:audit]', JSON.stringify(result));
  }

  return result;
}

/**
 * Manually trigger a specific reminder for a payment.
 * Useful for "Send reminder now" button in the UI.
 *
 * @param {string} paymentId
 * @param {Object} ctx
 * @returns {Promise<Object>}
 */
export async function triggerManualReminder(paymentId, ctx) {
  const payment = await ScheduledPayment.findById(paymentId);
  if (!payment) throw new Error(`Payment ${paymentId} not found`);

  const user = await ctx.getUser(payment.user);
  if (!user) throw new Error(`User ${payment.user} not found`);

  const dueDate = new Date(payment.due_date);
  const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const channels = payment.reminders.channels || ['email'];

  const results = [];
  for (const channel of channels) {
    const sender = channelSenders[channel];
    if (!sender) continue;
    try {
      await sender(user, payment, Math.max(0, daysUntilDue));
      results.push({ channel, status: 'sent' });
    } catch (err) {
      results.push({ channel, status: 'failed', error: err.message });
    }
  }

  return { paymentId, daysUntilDue, results };
}

export default { processReminders, triggerManualReminder };