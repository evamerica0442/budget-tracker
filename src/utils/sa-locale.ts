/**
 * South African Localization Configuration
 * Provides South African-specific settings, holidays, and conventions
 */

// South African Public Holidays 2024-2025
export const saPublicHolidays = {
  2024: [
    { date: '2024-01-01', name: 'New Year Day' },
    { date: '2024-03-21', name: 'Human Rights Day' },
    { date: '2024-04-27', name: 'Freedom Day' },
    { date: '2024-05-01', name: 'Workers Day' },
    { date: '2024-06-17', name: 'Youth Day' },
    { date: '2024-06-19', name: 'Day of Reconciliation (observed)' }, // moved from Jun 16
    { date: '2024-12-25', name: 'Christmas Day' },
    { date: '2024-12-26', name: 'Day of Goodwill' },
  ],
  2025: [
    { date: '2025-01-01', name: 'New Year Day' },
    { date: '2025-03-21', name: 'Human Rights Day' },
    { date: '2025-04-27', name: 'Freedom Day' },
    { date: '2025-05-01', name: 'Workers Day' },
    { date: '2025-06-16', name: 'Youth Day' },
    { date: '2025-06-17', name: 'Day of Reconciliation (observed)' }, // moved from Jun 16
    { date: '2025-12-25', name: 'Christmas Day' },
    { date: '2025-12-26', name: 'Day of Goodwill' },
  ],
};

// Check if a date is a South African public holiday
export const isSAPublicHoliday = (date: Date | string): { isHoliday: boolean; name?: string } => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const dateStr = dateObj.toISOString().split('T')[0];
  const year = dateObj.getFullYear();
  
  const holidays = saPublicHolidays[year as keyof typeof saPublicHolidays] || [];
  const holiday = holidays.find(h => h.date === dateStr);
  
  return {
    isHoliday: !!holiday,
    name: holiday?.name
  };
};

// South African provinces
export const saProvinces = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape'
];

// South African locale strings for common UI elements
export const saLocaleStrings = {
  currency: 'ZAR',
  currencySymbol: 'R',
  locale: 'en-ZA',
  dateFormat: 'DD/MM/YYYY',
  
  // Common UI labels
  labels: {
    dashboard: 'Financial Overview',
    transactions: 'Transaction Management',
    categories: 'Category Management',
    income: 'Income',
    expense: 'Expense',
    balance: 'Balance',
    monthlyIncome: 'Monthly Income',
    monthlyExpenses: 'Monthly Expenses',
    netBalance: 'Net Balance',
    recentTransactions: 'Recent Transactions',
    noData: 'No data available',
    addTransaction: 'Add Transaction',
    editTransaction: 'Edit Transaction',
    deleteTransaction: 'Delete Transaction',
    addCategory: 'Add Category',
    editCategory: 'Edit Category',
    deleteCategory: 'Delete Category',
  },

  // Month names in South African English
  monthNames: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],

  // Day names in South African English
  dayNames: [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ],

  // Common messages
  messages: {
    confirmDelete: 'Are you sure you want to delete this?',
    deleteSuccess: 'Successfully deleted.',
    addSuccess: 'Successfully added.',
    updateSuccess: 'Successfully updated.',
    error: 'An error occurred.',
    requiredField: 'This field is required.',
    invalidAmount: 'Please enter a valid amount.',
    categoryExists: 'A category with this name already exists.',
    categoryInUse: 'Cannot delete a category that is being used in transactions.',
  },

  // VAT-related (for future tax features)
  tax: {
    vatRate: 0.15, // 15% VAT in South Africa
    incomeTaxBrackets: [
      { from: 0, to: 100000, rate: 0 },
      { from: 100001, to: 158750, rate: 0.18 },
      { from: 158751, to: 237100, rate: 0.25 },
      { from: 237101, to: 365600, rate: 0.30 },
      { from: 365601, to: 528600, rate: 0.35 },
      { from: 528601, to: 817600, rate: 0.38 },
      { from: 817601, to: Number.MAX_VALUE, rate: 0.41 }
    ]
  }
};

// Common South African expense categories
export const commonSAExpenses = [
  'Groceries',
  'Transport (Fuel)',
  'Transport (Public)',
  'Bond/Rent',
  'Electricity',
  'Water',
  'Internet',
  'Cell Phone',
  'Medical Aid',
  'Doctors/Hospitals',
  'School Fees',
  'Petrol',
  'Insurance',
  'Rates & Taxes',
  'TV License',
  'Entertainment',
  'Dining Out',
  'Shopping',
  'Petrol/Diesel',
  'Taxi/Uber',
  'Gas (LPG)',
];

// Common South African income categories
export const commonSAIncome = [
  'Salary',
  'Business Income',
  'Freelance Work',
  'Investment Returns',
  'Rental Income',
  'Pension',
  'Grants/Benefits',
  'Bonus',
  'Commission',
];

// South African bank names (for future integration)
export const saBanks = [
  'Absa',
  'FNB',
  'Nedbank',
  'Standard Bank',
  'Capitec',
  'African Bank',
  'Tymebank',
  'Discovery Bank',
  'TymeBank',
  'Investec',
  'Old Mutual Bank',
];

// Helper function to format amounts for South African context
export const formatSAAmount = (amount: number, includeSymbol: boolean = true): string => {
  const formatted = new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(amount));

  if (includeSymbol) {
    return `${saLocaleStrings.currencySymbol}${formatted}`;
  }
  return formatted;
};

// Helper to get fiscal year (South Africa uses calendar year)
export const getSAFiscalYear = (date: Date = new Date()): { start: string; end: string } => {
  const year = date.getFullYear();
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`
  };
};
