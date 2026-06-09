import React, { useState, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../utils/formatting';
import { Transaction } from '../types/budget';
import '../styles/CashFlowSimulation.css';

interface Debt {
  id: string;
  name: string;
  balance: number;
  interestRate: number; // annual %
  monthlyPayment: number;
}

const CashFlowSimulation: React.FC = () => {
  const budgetContext = useBudget();
  const budgetState = budgetContext.state;

  // Baseline states
  const [startingBalance, setStartingBalance] = useState<number>(10000);
  const [baselineIncome, setBaselineIncome] = useState<number>(25000);
  const [baselineExpenses, setBaselineExpenses] = useState<number>(18000);
  const [debts, setDebts] = useState<Debt[]>([
    { id: '1', name: 'Car Loan', balance: 80000, interestRate: 9, monthlyPayment: 2500 },
    { id: '2', name: 'Credit Card', balance: 15000, interestRate: 18, monthlyPayment: 800 }
  ]);

  // "What-If" scenario adjustments
  const [incomeChange, setIncomeChange] = useState<number>(0);
  const [expenseChange, setExpenseChange] = useState<number>(0);
  const [loanRepaymentIncrease, setLoanRepaymentIncrease] = useState<number>(500); // Prefilled with user's example R500
  const [selectedDebtId, setSelectedDebtId] = useState<string>('1'); // apply increase to which debt

  // Load baseline values from actual transactions if available
  useEffect(() => {
    if (budgetState.transactions && budgetState.transactions.length > 0) {
      // Calculate current month's transactions
      const now = new Date();
      const currentMonthTransactions = budgetState.transactions.filter((t: Transaction) => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      const income = currentMonthTransactions
        .filter((t: Transaction) => t.type === 'income')
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

      const expenses = currentMonthTransactions
        .filter((t: Transaction) => t.type === 'expense')
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

      if (income > 0) setBaselineIncome(income);
      if (expenses > 0) setBaselineExpenses(expenses);

      // Calculate historical balance as starting balance
      const totalBalance = budgetState.transactions.reduce((total: number, t: Transaction) => {
        return t.type === 'income' ? total + t.amount : total - t.amount;
      }, 0);
      setStartingBalance(totalBalance > 0 ? totalBalance : 10000);
    }
  }, [budgetState.transactions]);

  // Debt handlers
  const handleAddDebt = () => {
    const newDebt: Debt = {
      id: Date.now().toString(),
      name: 'New Loan/Debt',
      balance: 10000,
      interestRate: 10,
      monthlyPayment: 500
    };
    setDebts([...debts, newDebt]);
    setSelectedDebtId(newDebt.id);
  };

  const handleUpdateDebt = (id: string, fields: Partial<Debt>) => {
    setDebts(debts.map(d => d.id === id ? { ...d, ...fields } : d));
  };

  const handleDeleteDebt = (id: string) => {
    setDebts(debts.filter(d => d.id !== id));
    if (selectedDebtId === id && debts.length > 1) {
      setSelectedDebtId(debts.filter(d => d.id !== id)[0].id);
    }
  };

  // Run the projection logic over 24 months
  const runProjection = () => {
    const projectionMonths = 24;
    const data = [];

    // Deep copy baseline & scenario debts
    let baselineDebts = debts.map(d => ({ ...d }));
    let scenarioDebts = debts.map(d => ({ ...d }));

    let baselineCash = startingBalance;
    let scenarioCash = startingBalance;

    const baselineMonthlySurplus = baselineIncome - baselineExpenses;
    const scenarioMonthlySurplus = (baselineIncome + incomeChange) - (baselineExpenses + expenseChange);

    for (let month = 0; month <= projectionMonths; month++) {
      // Month labels
      const projectDate = new Date();
      projectDate.setMonth(projectDate.getMonth() + month);
      const monthLabel = projectDate.toLocaleString('default', { month: 'short', year: '2-digit' });

      // Calculate remaining debt balances
      const totalBaselineDebt = baselineDebts.reduce((sum, d) => sum + d.balance, 0);
      const totalScenarioDebt = scenarioDebts.reduce((sum, d) => sum + d.balance, 0);

      data.push({
        name: monthLabel,
        'Baseline Cash': Math.round(baselineCash),
        'Scenario Cash': Math.round(scenarioCash),
        'Baseline Debt': Math.round(totalBaselineDebt),
        'Scenario Debt': Math.round(totalScenarioDebt),
        'Baseline Net Worth': Math.round(baselineCash - totalBaselineDebt),
        'Scenario Net Worth': Math.round(scenarioCash - totalScenarioDebt)
      });

      if (month === projectionMonths) break; // Projections calculated for current state, then simulated forward

      // Baseline Debt Simulation
      baselineDebts = baselineDebts.map(d => {
        if (d.balance <= 0) return d;
        // Apply interest
        const interest = (d.balance * (d.interestRate / 100)) / 12;
        // Apply payment
        const payment = Math.min(d.balance + interest, d.monthlyPayment);
        baselineCash -= payment;
        return {
          ...d,
          balance: Math.max(0, d.balance + interest - payment)
        };
      });

      // Scenario Debt Simulation
      scenarioDebts = scenarioDebts.map(d => {
        if (d.balance <= 0) return d;
        // Apply interest
        const interest = (d.balance * (d.interestRate / 100)) / 12;
        // Determine monthly repayment
        let paymentAmount = d.monthlyPayment;
        if (d.id === selectedDebtId) {
          paymentAmount += loanRepaymentIncrease;
        }
        const payment = Math.min(d.balance + interest, paymentAmount);
        scenarioCash -= payment;
        return {
          ...d,
          balance: Math.max(0, d.balance + interest - payment)
        };
      });

      // Income additions
      baselineCash += baselineMonthlySurplus;
      scenarioCash += scenarioMonthlySurplus;
    }

    return data;
  };

  const projectionData = runProjection();

  // Find Debt-free Months
  const getDebtFreeTimeline = (scenarioType: 'Baseline' | 'Scenario') => {
    let currentDebts = debts.map(d => ({ ...d }));
    let months = 0;
    const maxMonths = 120; // limit simulation to 10 years

    while (currentDebts.some(d => d.balance > 0) && months < maxMonths) {
      months++;
      currentDebts = currentDebts.map(d => {
        if (d.balance <= 0) return d;
        const interest = (d.balance * (d.interestRate / 100)) / 12;
        let paymentAmount = d.monthlyPayment;
        if (scenarioType === 'Scenario' && d.id === selectedDebtId) {
          paymentAmount += loanRepaymentIncrease;
        }
        const payment = Math.min(d.balance + interest, paymentAmount);
        return {
          ...d,
          balance: Math.max(0, d.balance + interest - payment)
        };
      });
    }

    return months >= maxMonths ? '10+ years' : `${months} months`;
  };

  const baselineDebtFree = getDebtFreeTimeline('Baseline');
  const scenarioDebtFree = getDebtFreeTimeline('Scenario');

  // Final Projected Net Worth at 24 Months
  const finalBaselineNW = projectionData[projectionData.length - 1]['Baseline Net Worth'];
  const finalScenarioNW = projectionData[projectionData.length - 1]['Scenario Net Worth'];
  const netWorthDifference = finalScenarioNW - finalBaselineNW;

  return (
    <div className="cash-flow-sim-page">
      <div className="page-header">
        <h2>🔮 Cash Flow "What-If" Simulator</h2>
        <p className="subtitle">Model financial scenarios to project your net worth and see how minor changes affect your debt payoff timeline!</p>
      </div>

      <div className="sim-grid">
        {/* Left Side: Inputs */}
        <div className="sim-inputs-panel">
          {/* Section 1: Baseline */}
          <div className="sim-card">
            <h3>📈 Current Baseline (Prefilled from actuals)</h3>
            <div className="form-group">
              <label>Starting Cash Balance (ZAR)</label>
              <input
                type="number"
                className="form-control"
                value={startingBalance}
                onChange={(e) => setStartingBalance(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Monthly Income</label>
                <input
                  type="number"
                  className="form-control"
                  value={baselineIncome}
                  onChange={(e) => setBaselineIncome(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label>Monthly Expenses</label>
                <input
                  type="number"
                  className="form-control"
                  value={baselineExpenses}
                  onChange={(e) => setBaselineExpenses(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Debt Profile */}
          <div className="sim-card">
            <div className="card-header-with-action">
              <h3>💳 Debt Portfolio & Repayments</h3>
              <button className="btn btn-secondary btn-sm" onClick={handleAddDebt}>
                + Add Debt
              </button>
            </div>
            {debts.length === 0 ? (
              <p className="no-debts">No active debts. Add a debt/loan to simulate payback schedules!</p>
            ) : (
              <div className="debts-list">
                {debts.map(debt => (
                  <div key={debt.id} className="debt-input-row" style={{ borderLeftColor: debt.id === selectedDebtId ? '#3498db' : '#ccc' }}>
                    <div className="debt-details">
                      <input
                        type="text"
                        className="form-control debt-name"
                        value={debt.name}
                        onChange={(e) => handleUpdateDebt(debt.id, { name: e.target.value })}
                        placeholder="Debt Name"
                      />
                      <button className="btn-delete-small" onClick={() => handleDeleteDebt(debt.id)} title="Delete debt">×</button>
                    </div>
                    <div className="form-row-three">
                      <div className="form-group">
                        <label>Balance</label>
                        <input
                          type="number"
                          className="form-control"
                          value={debt.balance}
                          onChange={(e) => handleUpdateDebt(debt.id, { balance: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Interest %</label>
                        <input
                          type="number"
                          className="form-control"
                          value={debt.interestRate}
                          onChange={(e) => handleUpdateDebt(debt.id, { interestRate: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Payment</label>
                        <input
                          type="number"
                          className="form-control"
                          value={debt.monthlyPayment}
                          onChange={(e) => handleUpdateDebt(debt.id, { monthlyPayment: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: What-If Adjustments */}
          <div className="sim-card adjustment-card">
            <h3>🤔 Modeling Scenario ("What If" Actions)</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Change Monthly Income by</label>
                <div className="input-with-indicator">
                  <input
                    type="number"
                    className="form-control"
                    value={incomeChange}
                    onChange={(e) => setIncomeChange(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. +3000 or -1500"
                  />
                  <span className="addon">ZAR</span>
                </div>
              </div>

              <div className="form-group">
                <label>Reduce Monthly Expenses by</label>
                <div className="input-with-indicator">
                  <input
                    type="number"
                    className="form-control"
                    value={expenseChange}
                    onChange={(e) => setExpenseChange(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. -2000"
                  />
                  <span className="addon">ZAR</span>
                </div>
              </div>
            </div>

            {debts.length > 0 && (
              <div className="form-row">
                <div className="form-group">
                  <label>Select Debt to Accelerate</label>
                  <select
                    className="form-control"
                    value={selectedDebtId}
                    onChange={(e) => setSelectedDebtId(e.target.value)}
                  >
                    {debts.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Increase monthly repayment by</label>
                  <div className="input-with-indicator">
                    <input
                      type="number"
                      className="form-control"
                      value={loanRepaymentIncrease}
                      onChange={(e) => setLoanRepaymentIncrease(parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 500"
                    />
                    <span className="addon">ZAR</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Projections & Insights */}
        <div className="sim-results-panel">
          {/* Key Insights Summary */}
          <div className="insights-grid">
            <div className="insight-card">
              <h4>Projected 2-Year Net Worth</h4>
              <div className="insight-comparison">
                <div className="comparison-item">
                  <span className="label">Baseline</span>
                  <span className="value">{formatCurrency(finalBaselineNW)}</span>
                </div>
                <div className="comparison-item border-left">
                  <span className="label">Scenario</span>
                  <span className="value positive">{formatCurrency(finalScenarioNW)}</span>
                </div>
              </div>
              <div className="insight-diff">
                Gain of <strong>{formatCurrency(Math.abs(netWorthDifference))}</strong> with Scenario changes!
              </div>
            </div>

            <div className="insight-card">
              <h4>Debt payoff timeline</h4>
              <div className="insight-comparison">
                <div className="comparison-item">
                  <span className="label">Baseline</span>
                  <span className="value">{baselineDebtFree}</span>
                </div>
                <div className="comparison-item border-left">
                  <span className="label">Scenario</span>
                  <span className="value positive">{scenarioDebtFree}</span>
                </div>
              </div>
              <div className="insight-diff">
                {baselineDebtFree === scenarioDebtFree ? (
                  <span>No change to total debt timeline.</span>
                ) : (
                  <span>Pay off debt up to <strong>{parseInt(baselineDebtFree) - parseInt(scenarioDebtFree)} months faster!</strong></span>
                )}
              </div>
            </div>
          </div>

          {/* Chart Projections */}
          <div className="sim-card chart-card">
            <h3>📈 24-Month Cumulative Net Worth Forecast</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(val) => `R${val / 1000}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="Baseline Net Worth" stroke="#7f8c8d" strokeWidth={2} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="Scenario Net Worth" stroke="#2ecc71" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="chart-disclaimer">This simulation computes compound monthly cash growth and debt payback schedules using interest math on static rates.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowSimulation;
