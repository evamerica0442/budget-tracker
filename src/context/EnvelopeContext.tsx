import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { envelopeAPI } from '../services/api';
import { Envelope } from '../types/budget';

interface EnvelopeState {
  envelopes: Envelope[];
  loading: boolean;
  error: string | null;
  useOfflineMode: boolean;
}

type EnvelopeAction =
  | { type: 'ADD_ENVELOPE'; payload: Envelope }
  | { type: 'UPDATE_ENVELOPE'; payload: Envelope }
  | { type: 'DELETE_ENVELOPE'; payload: string }
  | { type: 'SET_ENVELOPES'; payload: Envelope[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_DATA' }
  | { type: 'SET_OFFLINE_MODE'; payload: boolean };

const initialState: EnvelopeState = {
  envelopes: [],
  loading: false,
  error: null,
  useOfflineMode: false,
};

const envelopeReducer = (state: EnvelopeState, action: EnvelopeAction): EnvelopeState => {
  switch (action.type) {
    case 'ADD_ENVELOPE':
      return {
        ...state,
        envelopes: [...state.envelopes, action.payload],
      };
    case 'UPDATE_ENVELOPE':
      return {
        ...state,
        envelopes: state.envelopes.map(envelope =>
          envelope.id === action.payload.id ? action.payload : envelope
        ),
      };
    case 'DELETE_ENVELOPE':
      return {
        ...state,
        envelopes: state.envelopes.filter(envelope => envelope.id !== action.payload),
      };
    case 'SET_ENVELOPES':
      return {
        ...state,
        envelopes: action.payload,
      };
    case 'RESET_DATA':
      return {
        ...initialState,
        envelopes: []
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

interface EnvelopeContextType {
  state: EnvelopeState;
  addEnvelope: (envelope: Omit<Envelope, 'id'>) => Promise<void>;
  updateEnvelope: (envelope: Envelope) => Promise<void>;
  deleteEnvelope: (id: string) => Promise<void>;
  addFunds: (id: string, amount: number) => Promise<void>;
  spend: (id: string, amount: number) => Promise<void>;
  refillEnvelope: (id: string) => Promise<void>;
}

const EnvelopeContext = createContext<EnvelopeContextType | undefined>(undefined);

export const useEnvelope = () => {
  const context = useContext(EnvelopeContext);
  if (context === undefined) {
    throw new Error('useEnvelope must be used within an EnvelopeProvider');
  }
  return context;
};

export const EnvelopeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(envelopeReducer, initialState);
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
        const envelopesData = await envelopeAPI.getAll();
        dispatch({ type: 'SET_ENVELOPES', payload: envelopesData });
        dispatch({ type: 'SET_OFFLINE_MODE', payload: false });
        dispatch({ type: 'SET_ERROR', payload: null });
      } catch (error) {
        console.warn('⚠️ API unavailable for envelopes, switching to offline mode', error);
        
        // Try to load from localStorage as fallback
        const savedEnvelopes = localStorage.getItem('envelopes');
        
        if (savedEnvelopes) {
          try {
            dispatch({ type: 'SET_ENVELOPES', payload: JSON.parse(savedEnvelopes) });
          } catch (e) {
            console.error('Error loading envelopes from localStorage:', e);
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

  // Sync envelopes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('envelopes', JSON.stringify(state.envelopes));
  }, [state.envelopes]);

  const addEnvelope = async (envelope: Omit<Envelope, 'id'>) => {
    try {
      if (state.useOfflineMode) {
        // Offline mode: add locally
        const newEnvelope: Envelope = {
          ...envelope,
          id: Date.now().toString(),
        };
        dispatch({ type: 'ADD_ENVELOPE', payload: newEnvelope });
      } else {
        // Online mode: add to API and update state
        const newEnvelope = await envelopeAPI.create(envelope);
        dispatch({ type: 'ADD_ENVELOPE', payload: newEnvelope });
      }
    } catch (error) {
      console.error('Error adding envelope:', error);
      throw error;
    }
  };

  const updateEnvelope = async (envelope: Envelope) => {
    try {
      if (state.useOfflineMode) {
        dispatch({ type: 'UPDATE_ENVELOPE', payload: envelope });
      } else {
        await envelopeAPI.update(envelope.id, envelope);
        dispatch({ type: 'UPDATE_ENVELOPE', payload: envelope });
      }
    } catch (error) {
      console.error('Error updating envelope:', error);
      throw error;
    }
  };

  const deleteEnvelope = async (id: string) => {
    try {
      if (state.useOfflineMode) {
        dispatch({ type: 'DELETE_ENVELOPE', payload: id });
      } else {
        await envelopeAPI.delete(id);
        dispatch({ type: 'DELETE_ENVELOPE', payload: id });
      }
    } catch (error) {
      console.error('Error deleting envelope:', error);
      throw error;
    }
  };

  const addFunds = async (id: string, amount: number) => {
    try {
      if (state.useOfflineMode) {
        const envelope = state.envelopes.find(e => e.id === id);
        if (envelope) {
          const updated = {
            ...envelope,
            currentAmount: envelope.currentAmount + amount,
          };
          dispatch({ type: 'UPDATE_ENVELOPE', payload: updated });
        }
      } else {
        const updatedEnvelope = await envelopeAPI.addFunds(id, amount);
        dispatch({ type: 'UPDATE_ENVELOPE', payload: updatedEnvelope });
      }
    } catch (error) {
      console.error('Error adding funds:', error);
      throw error;
    }
  };

  const spend = async (id: string, amount: number) => {
    try {
      if (state.useOfflineMode) {
        const envelope = state.envelopes.find(e => e.id === id);
        if (envelope) {
          const updated = {
            ...envelope,
            currentAmount: Math.max(0, envelope.currentAmount - amount),
          };
          dispatch({ type: 'UPDATE_ENVELOPE', payload: updated });
        }
      } else {
        const updatedEnvelope = await envelopeAPI.spend(id, amount);
        dispatch({ type: 'UPDATE_ENVELOPE', payload: updatedEnvelope });
      }
    } catch (error) {
      console.error('Error spending from envelope:', error);
      throw error;
    }
  };

  const refillEnvelope = async (id: string) => {
    try {
      if (state.useOfflineMode) {
        const envelope = state.envelopes.find(e => e.id === id);
        if (envelope) {
          const updated = {
            ...envelope,
            currentAmount: envelope.budgetAmount,
          };
          dispatch({ type: 'UPDATE_ENVELOPE', payload: updated });
        }
      } else {
        const updatedEnvelope = await envelopeAPI.refill(id);
        dispatch({ type: 'UPDATE_ENVELOPE', payload: updatedEnvelope });
      }
    } catch (error) {
      console.error('Error refilling envelope:', error);
      throw error;
    }
  };

  return (
    <EnvelopeContext.Provider
      value={{
        state,
        addEnvelope,
        updateEnvelope,
        deleteEnvelope,
        addFunds,
        spend,
        refillEnvelope,
      }}
    >
      {children}
    </EnvelopeContext.Provider>
  );
};
