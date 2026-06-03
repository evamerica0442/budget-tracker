export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string | Date;
}

export interface Category {
  id: string;
  name: string;
  displayName?: string;
  type: 'income' | 'expense';
  color: string;
}