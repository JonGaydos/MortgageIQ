import { Router } from 'express';
import db from '../db/index.js';
import { auth } from '../middleware/auth.js';
import { runWhatIfScenario, compareStrategies } from '../services/what-if.js';
import { calcMinPayment } from '../services/debt-strategy.js';

const router = Router();
router.use(auth);

/**
 * Helper: gather all current debts (loans + credit cards) for strategy calculations.
 */
function gatherAllDebts() {
  // Gather loans with current balances
  const loans = db.prepare('SELECT * FROM loans ORDER BY name').all();
  const loanDebts = loans.map(loan => {
    const latestPayment = db.prepare(
      'SELECT ending_balance FROM payments WHERE loan_id = ? ORDER BY payment_date DESC, id DESC LIMIT 1'
    ).get(loan.id);

    const balance = latestPayment
      ? parseFloat(latestPayment.ending_balance) || 0
      : parseFloat(loan.current_balance ?? loan.original_amount);

    const escrowAccount = db.prepare('SELECT monthly_escrow FROM escrow_accounts WHERE loan_id = ?').get(loan.id);
    const escrowMonthly = escrowAccount ? parseFloat(escrowAccount.monthly_escrow) || 0 : 0;

    return {
      id: loan.id,
      name: loan.name,
      balance,
      rate: parseFloat(loan.interest_rate) || 0,
      monthlyPayment: (parseFloat(loan.monthly_payment) || 0) - escrowMonthly,
      type: loan.loan_type,
    };
  }).filter(l => l.balance > 0.01);

  // Gather credit cards with latest snapshot balances
  const cards = db.prepare('SELECT * FROM credit_cards ORDER BY name').all();
  const cardDebts = cards.map(card => {
    const latestSnapshot = db.prepare(
      'SELECT current_balance FROM credit_card_snapshots WHERE card_id = ? ORDER BY snapshot_date DESC LIMIT 1'
    ).get(card.id);

    const balance = latestSnapshot
      ? parseFloat(latestSnapshot.current_balance) || 0
      : 0;

    const minPayment = calcMinPayment(
      balance,
      parseFloat(card.apr) || 0,
      parseFloat(card.min_payment_pct) || 1,
      parseFloat(card.min_payment_fixed) || 25
    );

    return {
      id: card.id,
      name: card.name,
      balance,
      apr: parseFloat(card.apr) || 0,
      minPayment,
    };
  }).filter(c => c.balance > 0.01);

  return { loans: loanDebts, cards: cardDebts };
}

// GET /api/strategy/compare — Compare Avalanche vs Snowball vs Minimum
router.get('/compare', (req, res) => {
  const { loans, cards } = gatherAllDebts();
  const extraMonthly = parseFloat(req.query.extra) || 0;

  const result = compareStrategies({ loans, cards, extraMonthly });

  // Add debt summary
  const totalDebt = [...loans, ...cards].reduce((s, d) => s + (d.balance || 0), 0);
  const debtCount = loans.length + cards.length;

  res.json({
    ...result,
    summary: {
      total_debt: Math.round(totalDebt * 100) / 100,
      debt_count: debtCount,
      loan_count: loans.length,
      card_count: cards.length,
      extra_monthly: extraMonthly,
    },
  });
});

// POST /api/strategy/what-if — Run a what-if scenario
router.post('/what-if', (req, res) => {
  const { loans: allLoans, cards: allCards } = gatherAllDebts();
  const { extraMonthly = 0, lumpSum = 0, strategy = 'avalanche', lumpTarget = 'highest_rate' } = req.body;

  const result = runWhatIfScenario({
    loans: allLoans,
    cards: allCards,
    extraMonthly: parseFloat(extraMonthly) || 0,
    lumpSum: parseFloat(lumpSum) || 0,
    strategy,
    lumpTarget,
  });

  res.json({
    ...result,
    debts: [
      ...allLoans.map(l => ({ id: `loan_${l.id}`, name: l.name, type: 'loan', balance: l.balance, rate: l.rate })),
      ...allCards.map(c => ({ id: `card_${c.id}`, name: c.name, type: 'card', balance: c.balance, rate: c.apr })),
    ],
  });
});

// GET /api/strategy/overview — Quick strategy overview for dashboard
router.get('/overview', (req, res) => {
  const { loans, cards } = gatherAllDebts();
  const totalDebt = [...loans, ...cards].reduce((s, d) => s + (d.balance || 0), 0);

  if (totalDebt <= 0) {
    return res.json({
      total_debt: 0,
      debt_count: 0,
      debt_free: true,
      avalanche: null,
      snowball: null,
    });
  }

  const result = compareStrategies({ loans, cards, extraMonthly: 0 });

  res.json({
    total_debt: Math.round(totalDebt * 100) / 100,
    debt_count: loans.length + cards.length,
    debt_free: false,
    avalanche: {
      months: result.avalanche.months,
      totalInterest: result.avalanche.totalInterest,
      debtFreeDate: result.avalanche.debtFreeDate,
    },
    snowball: {
      months: result.snowball.months,
      totalInterest: result.snowball.totalInterest,
      debtFreeDate: result.snowball.debtFreeDate,
    },
    best_strategy: result.best_strategy,
  });
});

export default router;
