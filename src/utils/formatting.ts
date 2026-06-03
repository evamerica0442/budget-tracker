/**
 * South African Rand currency formatting
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * South African number formatting (without currency)
 */
export const formatNumber = (amount: number): string => {
  return new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * South African date formatting
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(dateObj);
};

/**
 * South African month and year formatting
 */
export const formatMonthYear = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-ZA', {
    month: 'long',
    year: 'numeric'
  }).format(dateObj);
};

/**
 * South African day of week formatting
 */
export const formatDayOfWeek = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-ZA', {
    weekday: 'long'
  }).format(dateObj);
};

/**
 * Calculate South African PAYE (Income Tax)
 * Based on SARS 2024/2025 tax year rates
 */
export const calculatePAYE = (annualIncome: number): number => {
  // Tax brackets for 2024/2025 (1 March 2024 - 28 February 2025)
  const taxBrackets = [
    { min: 0, max: 237100, rate: 0.18 },
    { min: 237101, max: 370500, rate: 0.26 },
    { min: 370501, max: 512800, rate: 0.31 },
    { min: 512801, max: 673000, rate: 0.36 },
    { min: 673001, max: 857900, rate: 0.39 },
    { min: 857901, max: 1817000, rate: 0.41 },
    { min: 1807001, max: Infinity, rate: 0.45 }
  ];

  let tax = 0;
  let remainingIncome = annualIncome;

  for (const bracket of taxBrackets) {
    if (remainingIncome <= 0) break;
    
    const taxableInBracket = Math.min(remainingIncome, bracket.max - bracket.min);
    tax += taxableInBracket * bracket.rate;
    remainingIncome -= taxableInBracket;
  }

  return tax;
};

/**
 * Calculate UIF (Unemployment Insurance Fund)
 * 2% of income (1% paid by employee, 1% by employer)
 */
export const calculateUIF = (monthlyIncome: number): number => {
  // UIF cap at R17,112.04 (as of 2024)
  const uifCap = 17112.04;
  const uifContribution = Math.min(monthlyIncome, uifCap) * 0.01; // 1% from employee
  return uifContribution;
};

/**
 * Calculate SDL (Skills Development Levy)
 * 1% of payroll (0.5% paid by employee, 0.5% by employer)
 */
export const calculateSDL = (monthlyIncome: number): number => {
  const sdlContribution = monthlyIncome * 0.005; // 0.5% from employee
  return sdlContribution;
};

/**
 * Calculate monthly take-home pay after deductions
 */
export const calculateTakeHomePay = (grossMonthly: number): {
  net: number;
  paye: number;
  uif: number;
  sdl: number;
  totalDeductions: number;
} => {
  const annualGross = grossMonthly * 12;
  const payeMonthly = calculatePAYE(annualGross) / 12;
  const uifMonthly = calculateUIF(grossMonthly);
  const sdlMonthly = calculateSDL(grossMonthly);
  const totalDeductions = payeMonthly + uifMonthly + sdlMonthly;
  const netMonthly = grossMonthly - totalDeductions;

  return {
    net: netMonthly,
    paye: payeMonthly,
    uif: uifMonthly,
    sdl: sdlMonthly,
    totalDeductions
  };
};

/**
 * Format South African mobile number
 */
export const formatMobileNumber = (phoneNumber: string): string => {
  const digits = phoneNumber.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
  }
  
  return phoneNumber; // Return original if doesn't match expected format
};

/**
 * Validate South African ID number format
 */
export const isValidSAID = (idNumber: string): boolean => {
  const digits = idNumber.replace(/\D/g, '');
  return digits.length === 13;
};