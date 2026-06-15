/**
 * South African Bank CSV Parser
 * ==============================
 *
 * Normalizes bank statement CSVs into a standard JSON format:
 *   { id, date, amount, merchant, category }
 *
 * Supports: FNB, ABSA, Capitec, Nedbank, Standard Bank
 *
 * Usage:
 *   import { parseCSV } from './services/csv-parser.js';
 *   const transactions = parseCSV(fileBuffer, 'fnb');
 *   // => [{ date: '2026-06-15', amount: -4500, merchant: 'OLD MUTUAL', category: 'uncategorized' }]
 */

import { v4 as uuidv4 } from 'uuid';

// ── Column Mappings ─────────────────────────────────────────────────────────
// Each bank's CSV format has different column layouts. These maps translate
// the source column indexes/names to our normalized fields.

const BANK_CONFIGS = {
  /**
   * FNB (First National Bank) — eStatement CSV
   * Typical columns: Date, Description, Amount, Balance, Type
   */
  fnb: {
    delimiter: ',',
    headerRow: 0,
    skipRows: 0,
    columns: {
      date: 'Date',
      description: 'Description',
      amount: 'Amount',
    },
    // FNB credits are positive, debits are negative
    amountMultiplier: 1,
    dateFormat: 'YYYY/MM/DD',
    // Skip header and summary rows
    rowFilter: (row) => row.Date && row.Description && row.Amount,
  },

  /**
   * ABSA — Internet Banking CSV export
   * Typical columns: Transaction Date, Description, Debit, Credit, Balance
   */
  absa: {
    delimiter: ',',
    headerRow: 0,
    skipRows: 0,
    columns: {
      date: 'Transaction Date',
      description: 'Description',
      debit: 'Debit',
      credit: 'Credit',
    },
    dateFormat: 'DD MMM YYYY',
    rowFilter: (row) => row['Transaction Date'] && row.Description,
  },

  /**
   * Capitec — eStatement CSV
   * Typical columns: Date, Description, Amount, Balance
   */
  capitec: {
    delimiter: ',',
    headerRow: 0,
    skipRows: 0,
    columns: {
      date: 'Date',
      description: 'Description',
      amount: 'Amount',
    },
    amountMultiplier: 1,
    dateFormat: 'YYYY-MM-DD',
    rowFilter: (row) => row.Date && row.Description && row.Amount,
  },

  /**
   * Nedbank — eStatement CSV
   * Typical columns: Date, Description, Debit, Credit, Balance
   */
  nedbank: {
    delimiter: ',',
    headerRow: 0,
    skipRows: 0,
    columns: {
      date: 'Date',
      description: 'Description',
      debit: 'Debit',
      credit: 'Credit',
    },
    dateFormat: 'DD MMM YYYY',
    rowFilter: (row) => row.Date && row.Description,
  },

  /**
   * Standard Bank — eStatement CSV
   * Typical columns: Date, Description, Amount, Balance
   */
  standardbank: {
    delimiter: ',',
    headerRow: 0,
    skipRows: 0,
    columns: {
      date: 'Date',
      description: 'Description',
      amount: 'Amount',
    },
    amountMultiplier: 1,
    dateFormat: 'YYYY/MM/DD',
    rowFilter: (row) => row.Date && row.Description && row.Amount,
  },
};

// ── Date Parsing ────────────────────────────────────────────────────────────

/**
 * Parse date strings from various South African bank CSV formats into ISO 8601.
 * @param {string} dateStr
 * @param {string} format - One of 'YYYY/MM/DD', 'DD MMM YYYY', 'YYYY-MM-DD'
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
function parseDate(dateStr, format) {
  if (!dateStr) return null;

  const trimmed = dateStr.trim().replace(/['"]/g, '');

  switch (format) {
    case 'YYYY/MM/DD': {
      const parts = trimmed.split('/');
      if (parts.length === 3) {
        return `${parts[0].padStart(4, '0')}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      break;
    }
    case 'DD MMM YYYY': {
      // e.g. "15 Jun 2026"
      const months = {
        jan: '01', feb: '02', mar: '03', apr: '04',
        may: '05', jun: '06', jul: '07', aug: '08',
        sep: '09', oct: '10', nov: '11', dec: '12',
      };
      const match = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
      if (match) {
        const month = months[match[2].toLowerCase()];
        if (month) {
          return `${match[3]}-${month}-${match[1].padStart(2, '0')}`;
        }
      }
      break;
    }
    case 'YYYY-MM-DD':
      return trimmed;
    default:
      return trimmed;
  }

  return trimmed; // fallback — return as-is
}

/**
 * Safely parse a numeric amount from a string (handles ZAR formatting).
 * Removes 'R', spaces, and commas; handles negative values.
 * @param {string} val
 * @returns {number}
 */
function parseAmount(val) {
  if (val === undefined || val === null || val === '') return 0;

  let cleaned = String(val).trim().replace(/['"]/g, '');

  // Remove 'R' currency symbol
  cleaned = cleaned.replace(/R\s*/gi, '');

  // Replace comma decimal separator with period (SA convention: R 1,500.50)
  // If there's a comma AND a period, assume comma is thousand-separator
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // 1,500.50 => remove commas
    cleaned = cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',')) {
    // 1500,50 => replace comma with period
    cleaned = cleaned.replace(',', '.');
  }

  // Remove spaces
  cleaned = cleaned.replace(/\s/g, '');

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extract the amount from ABSA/Nedbank-style CSV rows that have separate
 * debit and credit columns.
 * @param {Object} row
 * @param {Object} colMap
 * @returns {number} Negative for debits, positive for credits
 */
function extractDebitCreditAmount(row, colMap) {
  const debit = parseAmount(row[colMap.debit]);
  const credit = parseAmount(row[colMap.credit]);

  if (debit > 0) return -Math.abs(debit);
  if (credit > 0) return Math.abs(credit);
  return 0;
}

// ── CSV Parsing ─────────────────────────────────────────────────────────────

/**
 * Simple CSV line parser (handles quoted fields).
 * @param {string} line
 * @param {string} delimiter
 * @returns {string[]}
 */
function parseCSVLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Main entry point. Parse a CSV buffer/string into normalized transactions.
 *
 * @param {string|Buffer} csvData - Raw CSV content
 * @param {string} bankName - One of: 'fnb', 'absa', 'capitec', 'nedbank', 'standardbank'
 * @param {Object} [options] - Optional overrides
 * @param {number} [options.toleranceDays=3] - Date matching tolerance in days
 * @returns {Array<{ id: string, date: string, amount: number, merchant: string, category: string, source: string }>}
 */
export function parseCSV(csvData, bankName, options = {}) {
  const bank = bankName.toLowerCase().replace(/[\s-]/g, '');
  const config = BANK_CONFIGS[bank];

  if (!config) {
    throw new Error(
      `Unsupported bank: "${bankName}". Supported banks: ${Object.keys(BANK_CONFIGS).join(', ')}`
    );
  }

  const { toleranceDays = 3 } = options;
  const content = typeof csvData === 'string' ? csvData : csvData.toString('utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  // Parse header
  const headerLine = lines[config.headerRow];
  const headers = parseCSVLine(headerLine, config.delimiter);

  // Build column index map
  const colIndex = {};
  headers.forEach((h, i) => {
    colIndex[h.trim()] = i;
  });

  // Verify required columns exist
  const requiredCols = Object.values(config.columns).filter((c) => c !== undefined);
  for (const col of requiredCols) {
    if (!(col in colIndex)) {
      // Some banks have 'Debit'/'Credit' but we only need Description
      if (col === 'Debit' || col === 'Credit') continue;
      console.warn(`[csv-parser] Missing column "${col}" in ${bankName} CSV. Available: ${Object.keys(colIndex).join(', ')}`);
    }
  }

  const transactions = [];
  const startLine = config.headerRow + 1 + config.skipRows;

  for (let i = startLine; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i], config.delimiter);

    // Skip short rows
    if (fields.length < headers.length) continue;

    // Build row object
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = fields[idx] || '';
    });

    // Apply row filter
    if (config.rowFilter && !config.rowFilter(row)) continue;

    const colMap = config.columns;

    // Extract date
    const rawDate = row[colMap.date];
    const date = parseDate(rawDate, config.dateFormat);
    if (!date) continue;

    // Extract amount
    let amount;
    if (colMap.debit) {
      amount = extractDebitCreditAmount(row, colMap);
    } else {
      amount = parseAmount(row[colMap.amount]) * (config.amountMultiplier || 1);
    }

    // Skip zero-value rows
    if (amount === 0) continue;

    // Extract merchant/description
    const merchant = (row[colMap.description] || '').trim().replace(/['"]/g, '');

    const transaction = {
      id: uuidv4(),
      date,
      amount,       // negative = expense, positive = income
      merchant,
      category: 'uncategorized',
      source: bankName.toLowerCase(),
      raw: row,     // keep original for debugging
    };

    transactions.push(transaction);
  }

  return transactions;
}

/**
 * Detect bank from CSV header content by checking column signatures.
 * @param {string} csvData - Raw CSV content
 * @returns {string|null} Bank name key or null if undetectable
 */
export function detectBank(csvData) {
  const content = typeof csvData === 'string' ? csvData : csvData.toString('utf-8');
  const firstLines = content.split(/\r?\n/).slice(0, 5).join('\n').toLowerCase();

  const signatures = [
    { bank: 'fnb', patterns: ['first national bank', 'fnb', '"date","description","amount"'] },
    { bank: 'absa', patterns: ['absa', 'transaction date,description,debit,credit'] },
    { bank: 'capitec', patterns: ['capitec', 'date,description,amount,balance'] },
    { bank: 'nedbank', patterns: ['nedbank', 'date,description,debit,credit'] },
    { bank: 'standardbank', patterns: ['standard bank', 'date,description,amount,balance'] },
  ];

  for (const sig of signatures) {
    for (const pattern of sig.patterns) {
      if (firstLines.includes(pattern)) {
        return sig.bank;
      }
    }
  }

  return null;
}

export default { parseCSV, detectBank };