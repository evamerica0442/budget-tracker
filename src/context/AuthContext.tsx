import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for saved user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('budget_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('budget_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const apiUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      const userData = { ...data.user, token: data.token };
      localStorage.setItem('budget_user', JSON.stringify(userData));
      setUser(userData);
    } else {
      throw new Error(data.error || 'Login failed');
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const apiUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
    const response = await fetch(`${apiUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      const userData = { ...data.user, token: data.token };
      localStorage.setItem('budget_user', JSON.stringify(userData));
      setUser(userData);
    } else {
      throw new Error(data.error || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('budget_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};