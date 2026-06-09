import express from 'express';

const router = express.Router();

router.post('/tips', async (req, res, next) => {
  try {
    const { summary } = req.body;

    if (!summary) {
      return res.status(400).json({ error: 'Missing summary in request body' });
    }

    const { month, totalIncome, totalExpenses, balance, expenseRatio, categories } = summary;

    // Check if Anthropic API Key is configured on backend
    if (process.env.ANTHROPIC_API_KEY) {
      const prompt = `
You are a personal finance coach. Analyse this monthly budget data and return exactly 3 
concise, actionable tips. Be specific — use the actual numbers. 
Format your response as JSON: { "tips": [ { "title": "...", "detail": "...", "type": "warning|success|info" } ] }

Budget data:
- Month: ${month}
- Income: R${(totalIncome || 0).toLocaleString()}
- Expenses: R${(totalExpenses || 0).toLocaleString()} (${expenseRatio || 0}% of income)
- Balance: R${(balance || 0).toLocaleString()}
- Spending by category: ${JSON.stringify(categories || {})}
      `.trim();

      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        const data = await response.json();
        if (data.content && data.content[0] && data.content[0].text) {
          const text = data.content[0].text;
          const clean = text.replace(/```json|```/g, '').trim();
          return res.json(JSON.parse(clean));
        } else {
          console.warn('Anthropic API returned unexpected response format. Falling back to intelligent tips generator.');
        }
      } catch (apiError) {
        console.error('Anthropic API Error:', apiError);
        // Fall back gracefully to local generation instead of failing
      }
    }

    // Intelligent Fallback Tips Generator
    // This parses the actual user metrics to return extremely targeted advice, guaranteeing 100% uptime
    const tips = [];

    // Tip 1: Expense Ratio assessment
    if (expenseRatio <= 50) {
      tips.push({
        title: 'Outstanding Budgeting!',
        detail: `Your expense ratio is incredibly low at ${expenseRatio}%. Saving R${balance.toLocaleString()} this month puts you in the top tier of financial health.`,
        type: 'success'
      });
    } else if (expenseRatio <= 80) {
      tips.push({
        title: 'Healthy Spending Ratio',
        detail: `Your expense ratio of ${expenseRatio}% is within the recommended 80% threshold. You have successfully maintained a surplus buffer of R${balance.toLocaleString()} this month.`,
        type: 'success'
      });
    } else {
      tips.push({
        title: 'High Expense Overhead',
        detail: `You spent ${expenseRatio}% of your income this month. Leaving only R${balance.toLocaleString()} as a cash buffer. Consider scanning non-essential categories for optimization.`,
        type: 'warning'
      });
    }

    // Tip 2: Category specific inspection
    let highestExpenseCat = '';
    let highestExpenseAmount = 0;
    
    if (categories && Object.keys(categories).length > 0) {
      Object.entries(categories).forEach(([cat, amt]) => {
        if (typeof amt === 'number' && amt > highestExpenseAmount) {
          highestExpenseAmount = amt;
          highestExpenseCat = cat;
        }
      });
    }

    if (highestExpenseCat) {
      const catPercentage = Math.round((highestExpenseAmount / (totalIncome || 1)) * 100);
      if (highestExpenseCat.toLowerCase() === 'entertainment' || highestExpenseCat.toLowerCase() === 'eating out' || highestExpenseCat.toLowerCase() === 'shopping') {
        tips.push({
          title: `Optimize ${highestExpenseCat}`,
          detail: `Your ${highestExpenseCat} spending (R${highestExpenseAmount.toLocaleString()}) represents ${catPercentage}% of your total income. Trimming this down by 20% would yield an extra R${Math.round(highestExpenseAmount * 0.2).toLocaleString()} in monthly savings.`,
          type: 'warning'
        });
      } else {
        tips.push({
          title: `Highest Spending: ${highestExpenseCat}`,
          detail: `R${highestExpenseAmount.toLocaleString()} was allocated to ${highestExpenseCat} this month. Keeping an eye on your largest category helps prevent incremental budget leaks.`,
          type: 'info'
        });
      }
    } else {
      tips.push({
        title: 'Build Consistent Categories',
        detail: 'Categorizing your expenses helps our AI identify hidden subscription drains and discretionary spending trends.',
        type: 'info'
      });
    }

    // Tip 3: General loan / savings insight
    const loanRepayment = categories ? (categories['loan'] || categories['loans'] || categories['debt'] || categories['car loan'] || 0) : 0;
    if (loanRepayment > 0) {
      tips.push({
        title: 'Accelerate Loan Payoffs',
        detail: `Your recorded loan/debt repayment is R${loanRepayment.toLocaleString()}. Paying just an extra R500/month as an overpayment directly on principal could shave months off your timeline and save significant interest.`,
        type: 'info'
      });
    } else if (balance > 0) {
      tips.push({
        title: 'Compound Your Savings',
        detail: `With R${balance.toLocaleString()} left over, consider setting up an automated transfer of R${Math.round(balance * 0.5).toLocaleString()} to a dedicated high-yield savings goal on day one of next month.`,
        type: 'info'
      });
    } else {
      tips.push({
        title: 'Emergency Fund Focus',
        detail: 'Aim to construct a starter emergency cash reserve of at least R5,000. This buffer prevents unexpected expenses from turning into costly credit card debt.',
        type: 'info'
      });
    }

    res.json({ tips });
  } catch (err) {
    next(err);
  }
});

export default router;
