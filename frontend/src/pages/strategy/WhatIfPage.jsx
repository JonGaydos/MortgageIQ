import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { API_BASE } from '../../utils/api';
import { fmtDate } from '../../utils/formatters';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import Field from '../../components/ui/Field';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export default function WhatIfPage() {
  const { authFetch } = useAuth();
  const { fmt } = useCurrency();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Scenario controls
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [lumpSum, setLumpSum] = useState(0);
  const [strategy, setStrategy] = useState('avalanche');
  const [lumpTarget, setLumpTarget] = useState('highest_rate');

  // Run initial scenario on load
  useEffect(() => {
    runScenario();
  }, []);

  const runScenario = async () => {
    setLoading(true);
    const res = await authFetch(`${API_BASE}/strategy/what-if`, {
      method: 'POST',
      body: JSON.stringify({ extraMonthly, lumpSum, strategy, lumpTarget }),
    });
    if (res.ok) {
      setResult(await res.json());
    }
    setLoading(false);
    setInitialLoad(false);
  };

  if (initialLoad && loading) return <div className="text-warm-gray text-center py-12">Loading...</div>;

  const hasDebts = result && result.debts && result.debts.length > 0;

  if (!hasDebts && !initialLoad) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/strategy')} className="text-xs">
            &larr; Back
          </Button>
          <h1 className="font-serif text-2xl font-bold">What-If Simulator</h1>
        </div>
        <Card>
          <div className="text-center py-8">
            <p className="text-warm-gray">No active debts to simulate. Add loans or credit cards first.</p>
          </div>
        </Card>
      </div>
    );
  }

  // Waterfall chart data
  const waterfallData = [];
  if (result) {
    const baseWF = result.base.waterfall || [];
    const scenarioWF = result.scenario.waterfall || [];
    const maxLen = Math.max(baseWF.length, scenarioWF.length);
    for (let i = 0; i < maxLen; i++) {
      waterfallData.push({
        month: baseWF[i]?.month || scenarioWF[i]?.month || 0,
        base: baseWF[i]?.total_balance || 0,
        scenario: scenarioWF[i]?.total_balance || 0,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate('/strategy')} className="text-xs">
          &larr; Back to Strategy
        </Button>
        <h1 className="font-serif text-2xl font-bold">What-If Simulator</h1>
      </div>

      {/* Controls */}
      <Card>
        <h3 className="font-serif font-bold mb-4">Scenario Parameters</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Extra Monthly Payment">
            <input
              type="number"
              className="input-field"
              placeholder="0"
              value={extraMonthly || ''}
              onChange={e => setExtraMonthly(parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="One-Time Lump Sum">
            <input
              type="number"
              className="input-field"
              placeholder="0"
              value={lumpSum || ''}
              onChange={e => setLumpSum(parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="Strategy">
            <select
              className="input-field"
              value={strategy}
              onChange={e => setStrategy(e.target.value)}
            >
              <option value="avalanche">Avalanche (Highest APR)</option>
              <option value="snowball">Snowball (Lowest Balance)</option>
            </select>
          </Field>
          <Field label="Lump Sum Target">
            <select
              className="input-field"
              value={lumpTarget}
              onChange={e => setLumpTarget(e.target.value)}
            >
              <option value="highest_rate">Highest Rate First</option>
              <option value="lowest_balance">Lowest Balance First</option>
              {result && result.debts.map(d => (
                <option key={d.id} value={`specific:${d.id}`}>
                  {d.name} ({fmt(d.balance)})
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <Button onClick={runScenario} disabled={loading}>
            {loading ? 'Calculating...' : 'Run Scenario'}
          </Button>
        </div>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Savings Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Months Saved"
              value={result.savings.months_saved > 0 ? `${result.savings.months_saved} mo` : '0'}
              color={result.savings.months_saved > 0 ? 'var(--color-sage)' : undefined}
            />
            <StatCard
              label="Interest Saved"
              value={fmt(result.savings.interest_saved)}
              color={result.savings.interest_saved > 0 ? 'var(--color-sage)' : undefined}
            />
            <StatCard
              label="Debt-Free (Base)"
              value={result.savings.debt_free_date_base ? fmtDate(result.savings.debt_free_date_base) : 'N/A'}
              subtitle={`${result.base.months} months`}
            />
            <StatCard
              label="Debt-Free (Scenario)"
              value={result.savings.debt_free_date_scenario ? fmtDate(result.savings.debt_free_date_scenario) : 'N/A'}
              subtitle={`${result.scenario.months} months`}
              color="var(--color-sage)"
            />
          </div>

          {/* Side-by-Side Comparison */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-serif font-bold">Base (Minimums Only)</h3>
                <Badge color="orange">Current Path</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-warm-gray">Total Months</span>
                  <span className="font-semibold">{result.base.months}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-warm-gray">Total Interest</span>
                  <span className="font-semibold">{fmt(result.base.totalInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-warm-gray">Total Paid</span>
                  <span className="font-semibold">{fmt(result.base.totalPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-warm-gray">Debt-Free Date</span>
                  <span className="font-semibold">{result.base.debtFreeDate ? fmtDate(result.base.debtFreeDate) : 'N/A'}</span>
                </div>
              </div>
            </Card>

            <Card accent="var(--color-sage)">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-serif font-bold">Your Scenario</h3>
                <Badge color="green">Optimized</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-warm-gray">Total Months</span>
                  <span className="font-semibold">{result.scenario.months}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-warm-gray">Total Interest</span>
                  <span className="font-semibold">{fmt(result.scenario.totalInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-warm-gray">Total Paid</span>
                  <span className="font-semibold">{fmt(result.scenario.totalPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-warm-gray">Debt-Free Date</span>
                  <span className="font-semibold">{result.scenario.debtFreeDate ? fmtDate(result.scenario.debtFreeDate) : 'N/A'}</span>
                </div>
                {(extraMonthly > 0 || lumpSum > 0) && (
                  <>
                    {extraMonthly > 0 && (
                      <div className="flex justify-between text-sage">
                        <span>Extra/month</span>
                        <span className="font-semibold">+{fmt(extraMonthly)}</span>
                      </div>
                    )}
                    {lumpSum > 0 && (
                      <div className="flex justify-between text-sage">
                        <span>Lump sum</span>
                        <span className="font-semibold">+{fmt(lumpSum)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Waterfall Comparison Chart */}
          {waterfallData.length > 1 && (
            <Card>
              <h3 className="font-serif font-bold mb-4">Balance Reduction — Base vs Scenario</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={waterfallData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    stroke="var(--color-warm-gray)"
                    label={{ value: 'Month', position: 'insideBottom', offset: -5, fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="var(--color-warm-gray)"
                    tickFormatter={v => `${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val) => fmt(val)}
                    contentStyle={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="base" stroke="var(--color-warm-gray)" strokeWidth={2} strokeDasharray="5 5" name="Base (Minimums)" dot={false} />
                  <Line type="monotone" dataKey="scenario" stroke="var(--color-sage)" strokeWidth={2} name="Your Scenario" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Per-Debt Payoff Timeline */}
          <Card>
            <h3 className="font-serif font-bold mb-4">Payoff Timeline (Your Scenario)</h3>
            <div className="space-y-2">
              {result.scenario.debtResults
                .sort((a, b) => (a.paidOffMonth || 999) - (b.paidOffMonth || 999))
                .map((d, i) => {
                  const debt = result.debts.find(x => x.id === d.id);
                  return (
                    <div key={d.id} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-cream/30 transition-colors">
                      <span className="w-6 h-6 rounded-full bg-gold/20 text-gold text-xs flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      <span className="text-sm">{d.type === 'loan' ? '\u{1F3E0}' : '\u{1F4B3}'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{d.name}</p>
                        <p className="text-xs text-warm-gray">
                          {debt ? `${fmt(debt.balance)} at ${debt.rate}%` : ''}
                        </p>
                      </div>
                      {d.paidOffMonth ? (
                        <Badge color="green">Month {d.paidOffMonth}</Badge>
                      ) : (
                        <Badge color="red">{fmt(d.remainingBalance)} remaining</Badge>
                      )}
                    </div>
                  );
                })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
