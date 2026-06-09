import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { savingsGoalAPI } from '../services/api';
import { SavingsGoal } from '../types/budget';

interface SavingsGoalState {
  goals: SavingsGoal[];
  loading: boolean;
  error: string | null;
  useOfflineMode: boolean;
}

type SavingsGoalAction =
  | { type: 'ADD_GOAL'; payload: SavingsGoal }
  | { type: 'UPDATE_GOAL'; payload: SavingsGoal }
  | { type: 'DELETE_GOAL'; payload: string }
  | { type: 'SET_GOALS'; payload: SavingsGoal[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_DATA' }
  | { type: 'SET_OFFLINE_MODE'; payload: boolean };

const initialState: SavingsGoalState = {
  goals: [],
  loading: false,
  error: null,
  useOfflineMode: false,
};

const savingsGoalReducer = (state: SavingsGoalState, action: SavingsGoalAction): SavingsGoalState => {
  switch (action.type) {
    case 'ADD_GOAL':
      return {
        ...state,
        goals: [...state.goals, action.payload],
      };
    case 'UPDATE_GOAL':
      return {
        ...state,
        goals: state.goals.map(goal =>
          goal.id === action.payload.id ? action.payload : goal
        ),
      };
    case 'DELETE_GOAL':
      return {
        ...state,
        goals: state.goals.filter(goal => goal.id !== action.payload),
      };
    case 'SET_GOALS':
      return {
        ...state,
        goals: action.payload,
      };
    case 'RESET_DATA':
      return {
        ...initialState,
        goals: []
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

interface SavingsGoalContextType {
  state: SavingsGoalState;
  addGoal: (goal: Omit<SavingsGoal, 'id'>) => Promise<void>;
  updateGoal: (goal: SavingsGoal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  contribute: (id: string, amount: number) => Promise<void>;
}

const SavingsGoalContext = createContext<SavingsGoalContextType | undefined>(undefined);

export const useSavingsGoal = () => {
  const context = useContext(SavingsGoalContext);
  if (context === undefined) {
    throw new Error('useSavingsGoal must be used within a SavingsGoalProvider');
  }
  return context;
};

export const SavingsGoalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(savingsGoalReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // Initialize data on mount
  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: 'RESET_DATA' });
      return;
    }

    const initializeData = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const goalsData = await savingsGoalAPI.getAll();
        dispatch({ type: 'SET_GOALS', payload: goalsData });
        dispatch({ type: 'SET_OFFLINE_MODE', payload: false });
        dispatch({ type: 'SET_ERROR', payload: null });
      } catch (error) {
        console.warn('⚠️ API unavailable for savings goals, switching to offline mode', error);
        
        const savedGoals = localStorage.getItem('savings_goals');
        if (savedGoals) {
          try {
            dispatch({ type: 'SET_GOALS', payload: JSON.parse(savedGoals) });
          } catch (e) {
            console.error('Error loading savings goals from localStorage:', e);
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

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('savings_goals', JSON.stringify(state.goals));
  }, [state.goals]);

  const addGoal = async (goal: Omit<SavingsGoal, 'id'>) => {
    try {
      if (state.useOfflineMode) {
        const newGoal: SavingsGoal = {
          ...goal,
          id: Date.now().toString(),
        };
        dispatch({ type: 'ADD_GOAL', payload: newGoal });
      } else {
        const newGoal = await savingsGoalAPI.create(goal);
        dispatch({ type: 'ADD_GOAL', payload: newGoal });
      }
    } catch (error) {
      console.error('Error adding goal:', error);
      throw error;
    }
  };

  const updateGoal = async (goal: SavingsGoal) => {
    try {
      if (state.useOfflineMode) {
        dispatch({ type: 'UPDATE_GOAL', payload: goal });
      } else {
        await savingsGoalAPI.update(goal.id, goal);
        dispatch({ type: 'UPDATE_GOAL', payload: goal });
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      if (state.useOfflineMode) {
        dispatch({ type: 'DELETE_GOAL', payload: id });
      } else {
        await savingsGoalAPI.delete(id);
        dispatch({ type: 'DELETE_GOAL', payload: id });
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  };

  const contribute = async (id: string, amount: number) => {
    try {
      if (state.useOfflineMode) {
        const goal = state.goals.find(g => g.id === id);
        if (goal) {
          const updated = {
            ...goal,
            currentAmount: goal.currentAmount + amount,
          };
          dispatch({ type: 'UPDATE_GOAL', payload: updated });
        }
      } else {
        const updatedGoal = await savingsGoalAPI.contribute(id, amount);
        dispatch({ type: 'UPDATE_GOAL', payload: updatedGoal });
      }
    } catch (error) {
      console.error('Error contributing to goal:', error);
      throw error;
    }
  };

  return (
    <SavingsGoalContext.Provider
      value={{
        state,
        addGoal,
        updateGoal,
        deleteGoal,
        contribute,
      }}
    >
      {children}
    </SavingsGoalContext.Provider>
  );
};
