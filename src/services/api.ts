/**
 * Budget Tracker API Service
 * Handles all communication with the backend API
 */
import { Transaction, Category } from '../types/budget';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Helper function for API calls
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Get token from localStorage
  const savedUser = localStorage.getItem('budget_user');
  const token = savedUser ? JSON.parse(savedUser).token : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API Error: ${response.status}`);
    }

    return data as T;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

/**
 * Transaction API calls
 */
export const transactionAPI = {
  // Get all transactions
  getAll: (filters?: { type?: string; category?: string; startDate?: string; endDate?: string }): Promise<Transaction[]> => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiCall<Transaction[]>(`/transactions${query}`);
  },

  // Get single transaction
  getById: (id: string): Promise<Transaction> => apiCall<Transaction>(`/transactions/${id}`),

  // Create transaction
  create: (data: Omit<Transaction, 'id'>): Promise<Transaction> => apiCall<Transaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Update transaction
  update: (id: string, data: Partial<Transaction>): Promise<Transaction> => apiCall<Transaction>(`/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Delete transaction
  delete: (id: string): Promise<void> => apiCall(`/transactions/${id}`, {
    method: 'DELETE',
  }),
};

/**
 * Category API calls
 */
export const categoryAPI = {
  // Get all categories
  getAll: (type?: 'income' | 'expense'): Promise<Category[]> => {
    const query = type ? `?type=${type}` : '';
    return apiCall<Category[]>(`/categories${query}`);
  },

  // Get single category
  getById: (id: string): Promise<Category> => apiCall<Category>(`/categories/${id}`),

  // Create category
  create: (data: {
    name: string;
    displayName: string;
    type: 'income' | 'expense';
    color: string;
  }): Promise<Category> => apiCall<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Update category
  update: (id: string, data: Partial<{
    name: string;
    displayName: string;
    type: 'income' | 'expense';
    color: string;
  }>): Promise<Category> => apiCall<Category>(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Delete category
  delete: (id: string): Promise<void> => apiCall(`/categories/${id}`, {
    method: 'DELETE',
  }),

  // Bulk seed categories
  bulkSeed: (categories: any[]): Promise<any> => apiCall('/categories/bulk/seed', {
    method: 'POST',
    body: JSON.stringify({ categories }),
  }),
};

/**
 * Health check
 */
export const healthCheck = () => apiCall('/health');

const apiService = { transactionAPI, categoryAPI, healthCheck };
export default apiService;
