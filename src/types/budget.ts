/**
 * Budget Tracker Type Definitions
 */

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string | Date;
  user?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  displayName?: string;
  type: 'income' | 'expense';
  color: string;
  user?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Envelope {
  id: string;
  name: string;
  budgetAmount: number;
  currentAmount: number;
  category?: string;
  color: string;
  period: 'monthly' | 'weekly' | 'yearly' | 'one-time';
  startDate: string | Date;
  endDate?: string | Date;
  autoRefill: boolean;
  user?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id?: string;
  email: string;
  name?: string;
  token?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export interface BudgetContextType {
  state: BudgetState;
  addTransaction: (data: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (data: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

export interface BudgetState {
  transactions: Transaction[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  useOfflineMode: boolean;
}
