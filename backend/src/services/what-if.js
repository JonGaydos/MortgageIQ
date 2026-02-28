import { calcPayoff } from './amortization.js';
import { calcCardPayoff, simulateAvalanche, simulateSnowball } from './debt-strategy.js';

/**
 * Run a what-if scenario across all debts (loans + credit cards).
 * @param {Object} params
 * @param {Array} params.loans - Array of { id, name, balance, rate, monthlyPayment, type }
 * @param {Array} params.cards - Array of { id, name, balance, apr, minPayment }
 * @param {number} params.extraMonthly - Extra monthly amount to throw at debt
 * @param {number} params.lumpSum - One-time lump sum payment
 * @param {string} params.strategy - 'avalanche' or 'snowball'
 * @param {string} params.lumpTarget - 'highest_rate' | 'lowest_balance' | 'specific:<id>'
 */
export function runWhatIfScenario({ loans = [], cards = [], extraMonthly = 0, lumpSum = 0, strategy = 'avalanche', lumpTarget = 'highest_rate' }) {
  // Build unified debt list
  const allDebts = [
    ...loans.map(l => ({
      id: `loan_${l.id}`,
      name: l.name,
      balance: l.balance,
      apr: l.rate,
      minPayment: l.monthlyPayment,
      type: 'loan',
      originalId: l.id,
    })),
    ...cards.map(c => ({
      id: `card_${c.id}`,
      name: c.name,
      balance: c.balance,
      apr: c.apr,
      minPayment: c.minPayment,
      type: 'card',
      originalId: c.id,
    })),
  ].filter(d => d.balance > 0.01);

  if (allDebts.length === 0) {
    return { base: emptyResult(), scenario: emptyResult(), savings: emptySavings() };
  }

  // Base scenario (no extra, no lump)
  const base = simulateUnified(allDebts, 0, 'avalanche');

  // Apply lump sum to appropriate debt
  const debtsAfterLump = applyLumpSum(allDebts, lumpSum, lumpTarget, strategy);

  // Scenario with extra + lump
  const scenario = simulateUnified(debtsAfterLump, extraMonthly, strategy);

  // Calculate savings
  const savings = {
    months_saved: base.months - scenario.months,
    interest_saved: Math.round((base.totalInterest - scenario.totalInterest) * 100) / 100,
    total_saved: Math.round((base.totalPaid - scenario.totalPaid) * 100) / 100,
    debt_free_date_base: addMonthsToNow(base.months),
    debt_free_date_scenario: addMonthsToNow(scenario.months),
  };

  return { base, scenario, savings };
}

/**
 * Compare multiple strategies side-by-side.
 */
export function compareStrategies({ loans = [], cards = [], extraMonthly = 0 }) {
  const allDebts = [
    ...loans.map(l => ({
      id: `loan_${l.id}`,
      name: l.name,
      balance: l.balance,
      apr: l.rate,
      minPayment: l.monthlyPayment,
      type: 'loan',
      originalId: l.id,
    })),
    ...cards.map(c => ({
      id: `card_${c.id}`,
      name: c.name,
      balance: c.balance,
      apr: c.apr,
      minPayment: c.minPayment,
      type: 'card',
      originalId: c.id,
    })),
  ].filter(d => d.balance > 0.01);

  if (allDebts.length === 0) {
    return { avalanche: emptyResult(), snowball: emptyResult(), minimum_only: emptyResult() };
  }

  const avalanche = simulateUnified(allDebts, extraMonthly, 'avalanche');
  const snowball = simulateUnified(allDebts, extraMonthly, 'snowball');
  const minimumOnly = simulateUnified(allDebts, 0, 'avalanche');

  return {
    avalanche,
    snowball,
    minimum_only: minimumOnly,
    best_strategy: avalanche.totalInterest <= snowball.totalInterest ? 'avalanche' : 'snowball',
    avalanche_saves_vs_minimum: Math.round((minimumOnly.totalInterest - avalanche.totalInterest) * 100) / 100,
    snowball_saves_vs_minimum: Math.round((minimumOnly.totalInterest - snowball.totalInterest) * 100) / 100,
  };
}

/**
 * Simulate unified payoff for all debts with a given strategy.
 */
function simulateUnified(debts, extraMonthly, strategy) {
  const state = debts.map(d => ({
    ...d,
    balance: parseFloat(d.balance) || 0,
    apr: parseFloat(d.apr) || 0,
    minPayment: parseFloat(d.minPayment) || 25,
    paidOff: false,
    paidOffMonth: null,
  }));

  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const waterfall = []; // For waterfall chart data

  while (state.some(d => d.balance > 0.01) && month < 600) {
    month++;

    // Sort active debts by strategy
    const active = state.filter(d => d.balance > 0.01);
    if (strategy === 'avalanche') {
      active.sort((a, b) => b.apr - a.apr);
    } else {
      active.sort((a, b) => a.balance - b.balance);
    }

    let monthExtra = extraMonthly;

    // Pay minimums first
    for (const debt of active) {
      const monthlyRate = debt.apr / 100 / 12;
      const interest = debt.balance * monthlyRate;
      totalInterest += interest;
      const minPmt = Math.min(debt.minPayment, debt.balance + interest);
      const principal = Math.max(0, minPmt - interest);
      debt.balance = Math.max(0, debt.balance - principal);
      totalPaid += minPmt;
    }

    // Apply extra to priority debt
    for (const debt of active) {
      if (monthExtra <= 0) break;
      if (debt.balance <= 0.01) continue;
      const extraPmt = Math.min(monthExtra, debt.balance);
      debt.balance = Math.max(0, debt.balance - extraPmt);
      monthExtra -= extraPmt;
      totalPaid += extraPmt;
    }

    // Track payoffs
    for (const debt of state) {
      if (!debt.paidOff && debt.balance <= 0.01) {
        debt.paidOff = true;
        debt.paidOffMonth = month;
      }
    }

    // Waterfall data (sample every 3 months for reasonable response size)
    if (month % 3 === 0 || month <= 6) {
      const totalRemaining = state.reduce((s, d) => s + d.balance, 0);
      waterfall.push({
        month,
        total_balance: Math.round(totalRemaining * 100) / 100,
        debts_remaining: state.filter(d => d.balance > 0.01).length,
      });
    }
  }

  return {
    months: month,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    debtFreeDate: addMonthsToNow(month),
    waterfall,
    debtResults: state.map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      paidOffMonth: d.paidOffMonth,
      remainingBalance: Math.round(d.balance * 100) / 100,
    })),
  };
}

/**
 * Apply lump sum payment to the appropriate debt.
 */
function applyLumpSum(debts, lumpSum, target, strategy) {
  if (!lumpSum || lumpSum <= 0) return debts;

  const cloned = debts.map(d => ({ ...d, balance: parseFloat(d.balance) }));
  let remaining = lumpSum;

  if (target && target.startsWith('specific:')) {
    const targetId = target.replace('specific:', '');
    const debt = cloned.find(d => d.id === targetId);
    if (debt) {
      const applied = Math.min(remaining, debt.balance);
      debt.balance -= applied;
      remaining -= applied;
    }
  }

  // Apply remaining lump to priority order
  const sorted = [...cloned].filter(d => d.balance > 0.01);
  if (strategy === 'avalanche' || target === 'highest_rate') {
    sorted.sort((a, b) => b.apr - a.apr);
  } else {
    sorted.sort((a, b) => a.balance - b.balance);
  }

  for (const debt of sorted) {
    if (remaining <= 0) break;
    const applied = Math.min(remaining, debt.balance);
    debt.balance -= applied;
    remaining -= applied;
  }

  return cloned;
}

function addMonthsToNow(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function emptyResult() {
  return { months: 0, totalInterest: 0, totalPaid: 0, debtFreeDate: null, waterfall: [], debtResults: [] };
}

function emptySavings() {
  return { months_saved: 0, interest_saved: 0, total_saved: 0, debt_free_date_base: null, debt_free_date_scenario: null };
}
