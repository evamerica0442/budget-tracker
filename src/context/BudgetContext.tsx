import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { transactionAPI, categoryAPI } from '../services/api';
import defaultSACategories from '../services/defaultCategories';
import { Transaction, Category } from '../types/budget'; // Corrected import path

// Convert default categories to display format
const defaultCategories: Category[] = defaultSACategories.map((cat: any) => ({
  id: cat.name,
  name: cat.name,
  displayName: cat.displayName,
  type: cat.type,
  color: cat.color,
}));

interface BudgetState {
  transactions: Transaction[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  useOfflineMode: boolean;
}

type BudgetAction =
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_DATA' }
  | { type: 'SET_OFFLINE_MODE'; payload: boolean };

const initialState: BudgetState = {
  transactions: [],
  categories: defaultCategories,
  loading: false,
  error: null,
  useOfflineMode: false,
};

const budgetReducer = (state: BudgetState, action: BudgetAction): BudgetState => {
  switch (action.type) {
    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [...state.transactions, action.payload],
      };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(transaction =>
          transaction.id === action.payload.id ? action.payload : transaction
        ),
      };
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter(transaction => transaction.id !== action.payload),
      };
    case 'SET_TRANSACTIONS':
      return {
        ...state,
        transactions: action.payload,
      };
    case 'ADD_CATEGORY':
      return {
        ...state,
        categories: [...state.categories, action.payload],
      };
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(category =>
          category.id === action.payload.id ? action.payload : category
        ),
      };
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(category => category.id !== action.payload),
      };
    case 'SET_CATEGORIES':
      return {
        ...state,
        categories: action.payload,
      };
    case 'RESET_DATA':
      return {
        ...initialState,
        categories: defaultCategories,
        transactions: []
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'SET_OFFLINE_MODE':
      return {
        ...state,
        useOfflineMode: action.payload,
      };
    default:
      return state;
  }
};

interface DuplicatePayload {
  sourceYear: number;
  sourceMonth: number;
  targetYear: number;
  targetMonth: number;
}

interface BudgetContextType {
  state: BudgetState;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  duplicateTransactions: (payload: DuplicatePayload) => Promise<number>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const useBudget = () => {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(budgetReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // Initialize data from API or localStorage on mount
  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: 'RESET_DATA' });
      return;
    }

    const initializeData = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        // Try to fetch from API
        const [transactionsData, categoriesData] = await Promise.all([
          transactionAPI.getAll(),
          categoryAPI.getAll(),
        ]);

        dispatch({ type: 'SET_TRANSACTIONS', payload: transactionsData });
        
        // Map API categories to display format
        const mappedCategories = categoriesData.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          displayName: cat.displayName || cat.name,
          type: cat.type,
          color: cat.color,
        }));
        dispatch({ type: 'SET_CATEGORIES', payload: mappedCategories });
        dispatch({ type: 'SET_OFFLINE_MODE', payload: false });
        dispatch({ type: 'SET_ERROR', payload: null });
      } catch (error) {
        console.warn('⚠️ API unavailable, switching to offline mode', error);
        
        // Try to load from localStorage as fallback
        const savedTransactions = localStorage.getItem('transactions');
        const savedCategories = localStorage.getItem('categories');
        
        if (savedTransactions) {
          try {
            dispatch({ type: 'SET_TRANSACTIONS', payload: JSON.parse(savedTransactions) });
          } catch (e) {
            console.error('Error loading transactions from localStorage:', e);
          }
        }
        
        if (savedCategories) {
          try {
            dispatch({ type: 'SET_CATEGORIES', payload: JSON.parse(savedCategories) });
          } catch (e) {
            console.error('Error loading categories from localStorage:', e);
          }
        }
        
        dispatch({ type: 'SET_OFFLINE_MODE', payload: true });
        dispatch({ type: 'SET_ERROR', payload: 'Running in offline mode. Changes will be local only.' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeData();
  }, [isAuthenticated, user]);

  // Sync transactions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(state.transactions));
  }, [state.transactions]);

  // Sync categories to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(state.categories));
  }, [state.categories]);

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      const dateStr = typeof transaction.date !== 'string'
        ? (transaction.date as Date).toISOString().split('T')[0]
        : transaction.date;

      if (state.useOfflineMode) {
        // Offline mode: add locally
        const newTransaction: Transaction = {
          ...transaction,
          id: Date.now().toString(),
          date: dateStr,
        };
        dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
      } else {
        // Online mode: add to API and update state
        const newTransaction = await transactionAPI.create({
          ...transaction,
          date: dateStr,
        });
        dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const updateTransaction = async (transaction: Transaction) => {
    try {
      const dateStr = typeof transaction.date !== 'string'
        ? (transaction.date as Date).toISOString().split('T')[0]
        : transaction.date;

      const normalizedTransaction = {
        ...transaction,
        date: dateStr,
      };

      if (state.useOfflineMode) {
        dispatch({ type: 'UPDATE_TRANSACTION', payload: normalizedTransaction });
      } else {
        await transactionAPI.update(transaction.id, normalizedTransaction);
        dispatch({ type: 'UPDATE_TRANSACTION', payload: normalizedTransaction });
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      if (state.useOfflineMode) {
        dispatch({ type: 'DELETE_TRANSACTION', payload: id });
      } else {
        await transactionAPI.delete(id);
        dispatch({ type: 'DELETE_TRANSACTION', payload: id });
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  const duplicateTransactions = async (payload: DuplicatePayload): Promise<number> => {
    try {
      if (state.useOfflineMode) {
        // Offline mode: find source month transactions and clone them locally
        const sourceTransactions = state.transactions.filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === payload.sourceMonth - 1 && d.getFullYear() === payload.sourceYear;
        });

        if (sourceTransactions.length === 0) {
          return 0;
        }

        const targetDateStart = new Date(payload.targetYear, payload.targetMonth - 1, 1);
        const lastDayOfTarget = new Date(payload.targetYear, payload.targetMonth, 0).getDate();

        const newTransactions: Transaction[] = sourceTransactions.map(t => {
          const originalDate = new Date(t.date);
          const day = originalDate.getDate();
          const newDate = new Date(targetDateStart);
          newDate.setDate(Math.min(day, lastDayOfTarget));

          return {
            ...t,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            date: newDate.toISOString().split('T')[0],
          };
        });

        newTransactions.forEach(t => dispatch({ type: 'ADD_TRANSACTION', payload: t }));
        return newTransactions.length;
      } else {
        const result = await transactionAPI.duplicate(payload);
        // Refresh transactions list from API to get the full updated data
        const updatedTransactions = await transactionAPI.getAll();
        dispatch({ type: 'SET_TRANSACTIONS', payload: updatedTransactions });
        return result.count;
      }
    } catch (error) {
      console.error('Error duplicating transactions:', error);
      throw error;
    }
  };

  const addCategory = async (category: Omit<Category, 'id'>) => {
    try {
      if (state.useOfflineMode) {
        const newCategory: Category = {
          ...category,
          id: Date.now().toString(),
        };
        dispatch({ type: 'ADD_CATEGORY', payload: newCategory });
      } else {
        const newCategory = await categoryAPI.create({
          name: (category.name || category.displayName || '').toLowerCase().trim(),
          displayName: category.displayName || category.name,
          type: category.type,
          color: category.color,
        });
        dispatch({ type: 'ADD_CATEGORY', payload: newCategory });
      }
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  };

  const updateCategory = async (category: Category) => {
    try {
      if (state.useOfflineMode) {
        dispatch({ type: 'UPDATE_CATEGORY', payload: category });
      } else {
        await categoryAPI.update(category.id, category);
        dispatch({ type: 'UPDATE_CATEGORY', payload: category });
      }
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      if (state.useOfflineMode) {
        dispatch({ type: 'DELETE_CATEGORY', payload: id });
      } else {
        await categoryAPI.delete(id);
        dispatch({ type: 'DELETE_CATEGORY', payload: id });
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  return (
    <BudgetContext.Provider
      value={{
        state,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        duplicateTransactions,
        addCategory,
        updateCategory,
        deleteCategory,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
};