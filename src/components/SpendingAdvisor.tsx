import React, { useState, useEffect } from 'react';
import { Transaction } from '../types/budget';
import { aiAPI } from '../services/api';

const typeStyles = {
  warning: { bg: '#2a1a1a', color: '#E24B4A', label: 'Watch out' },
  success: { bg: '#0a2a1a', color: '#1D9E75', label: 'Doing well' },
  info:    { bg: '#0a1a2a', color: '#378ADD', label: 'Tip'        }
};

interface SpendingAdvisorProps {
  transactions: Transaction[];
  month: string; // e.g. "2026-06"
}

interface Tip {
  title: string;
  detail: string;
  type: 'warning' | 'success' | 'info';
}

function buildSpendingSummary(transactions: Transaction[], month: string) {
  const monthTxns = transactions.filter((t: Transaction) => {
    const tDate = typeof t.date === 'string' ? t.date : (t.date as Date).toISOString();
    return tDate.startsWith(month);
  });

  const byCategory = monthTxns
    .filter((t: Transaction) => t.type === 'expense')
    .reduce((acc: Record<string, number>, t: Transaction) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const totalIncome = monthTxns
    .filter((t: Transaction) => t.type === 'income')
    .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

  const totalExpenses = Object.values(byCategory).reduce((a, b) => a + b, 0);

  return {
    month,
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    expenseRatio: totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 100,
    categories: byCategory
  };
}

const SpendingAdvisor: React.FC<SpendingAdvisorProps> = ({ transactions, month }) => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CACHE_KEY = `tips_${month}`;

  useEffect(() => {
    // Check cache on mount or when month changes
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { tips: cachedTips, generatedAt } = JSON.parse(cached);
        const ageHours = (Date.now() - generatedAt) / 3600000;
        if (ageHours < 6) {
          setTips(cachedTips);
        }
      } catch (e) {
        console.error('Error reading tips from cache:', e);
      }
    }
  }, [month, CACHE_KEY]);

  async function handleAnalyse() {
    setLoading(true);
    setError(null);
    try {
      const summary = buildSpendingSummary(transactions, month);
      const result = await aiAPI.getTips(summary);
      
      if (result && result.tips) {
        setTips(result.tips);
        
        // Cache result
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          tips: result.tips,
          generatedAt: Date.now()
        }));
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (e) {
      setError('Could not load tips — check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sim-card" style={{ marginTop: '1.5rem', borderLeft: '4px solid #9b59b6' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.5rem' }}>🤖</span>
          <h3 style={{ margin: 0, border: 'none', padding: 0 }}>AI Spending Advisor</h3>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleAnalyse} disabled={loading}>
          {loading ? 'Analysing…' : 'Analyse my spending'}
        </button>
      </div>

      {error && <p style={{ color: '#E24B4A', fontSize: 14, margin: '8px 0' }}>{error}</p>}

      {tips.length === 0 && !loading && !error && (
        <p style={{ color: 'var(--text-secondary, #7f8c8d)', fontSize: 13, margin: '1rem 0 0 0', fontStyle: 'italic' }}>
          Click "Analyse my spending" to generate intelligent, personalized financial coach tips based on your active transactions.
        </p>
      )}

      {tips.map((tip, i) => {
        const s = typeStyles[tip.type] || typeStyles.info;
        return (
          <div key={i} style={{
            background: s.bg,
            borderLeft: `3px solid ${s.color}`,
            borderRadius: 8,
            padding: '0.75rem 1rem',
            marginTop: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: 11, fontWeight: 500, color: s.color,
                background: s.bg, border: `1px solid ${s.color}`,
                borderRadius: 4, padding: '1px 6px'
              }}>{s.label}</span>
              <strong style={{ fontSize: 14, color: '#fff' }}>{tip.title}</strong>
            </div>
            <p style={{ fontSize: 13, color: '#ccc', margin: 0 }}>{tip.detail}</p>
          </div>
        );
      })}
    </div>
  );
};

export default SpendingAdvisor;
