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
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';

export default function StrategyPage() {
  const { authFetch } = useAuth();
  const { fmt } = useCurrency();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = async (extra = 0) => {
    const res = await authFetch(`${API_BASE}/strategy/compare?extra=${extra}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  };

  useEffect(() => { loadData(0); }, []);

  const handleExtraChange = (val) => {
    setExtraMonthly(val);
    loadData(val);
  };

  if (loading) return <div className="text-warm-gray text-center py-12">Loading...</div>;
  if (!data || data.summary.debt_count === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-2xl font-bold">Debt Strategy</h1>
        <Card>
          <div className="text-center py-8">
            <div className="text-4xl mb-3">{'\u{1F389}'}</div>
            <h3 className="font-serif text-lg font-bold">No Active Debt</h3>
            <p className="text-sm text-warm-gray mt-2">Add loans or credit cards to see payoff strategies.</p>
            <div className="flex gap-3 justify-center mt-4">
              <Button onClick={() => navigate('/loans')}>Add Loan</Button>
              <Button variant="outline" onClick={() => navigate('/credit-cards')}>Add Card</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const { avalanche, snowball, minimum_only, summary } = data;

  // Chart data: strategy comparison
  const comparisonData = [
    {
      name: 'Minimum Only',
      months: minimum_only.months,
      interest: minimum_only.totalInterest,
      fill: 'var(--color-warm-gray)',
    },
    {
      name: 'Avalanche',
      months: avalanche.months,
      interest: avalanche.totalInterest,
      fill: 'var(--color-terracotta)',
    },
    {
      name: 'Snowball',
      months: snowball.months,
      interest: snowball.totalInterest,
      fill: 'var(--color-sage)',
    },
  ];

  // Waterfall data — merge both strategies
  const maxLen = Math.max(avalanche.waterfall.length, snowball.waterfall.length);
  const waterfallData = [];
  for (let i = 0; i < maxLen; i++) {
    const av = avalanche.waterfall[i];
    const sn = snowball.waterfall[i];
    waterfallData.push({
      month: av?.month || sn?.month || 0,
      avalanche: av?.total_balance || 0,
      snowball: sn?.total_balance || 0,
    });
  }

  const extraPresets = [0, 50, 100, 200, 500];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-serif text-2xl font-bold">Debt Strategy</h1>
        <Button variant="outline" onClick={() => navigate('/strategy/what-if')}>
          What-If Simulator
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Debt"
          value={fmt(summary.total_debt)}
          color="var(--color-terracotta)"
          subtitle={`${summary.debt_count} debts (${summary.loan_count} loans, ${summary.card_count} cards)`}
        />
        <StatCard
          label="Best Strategy"
          value={data.best_strategy === 'avalanche' ? 'Avalanche' : 'Snowball'}
          color="var(--color-gold)"
          subtitle="Saves the most interest"
        />
        <StatCard
          label="Debt-Free In"
          value={`${data[data.best_strategy].months} mo`}
          subtitle={`By ${fmtDate(data[data.best_strategy].debtFreeDate)}`}
        />
        <StatCard
          label="Total Interest"
          value={fmt(data[data.best_strategy].totalInterest)}
          subtitle={extraMonthly > 0 ? `With ${fmt(extraMonthly)}/mo extra` : 'At minimum payments'}
        />
      </div>

      {/* Extra Payment Slider */}
      <Card>
        <h3 className="font-serif font-bold mb-3">Extra Monthly Payment</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-2">
            {extraPresets.map(amt => (
              <button
                key={amt}
                onClick={() => handleExtraChange(amt)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  extraMonthly === amt
                    ? 'bg-gold/20 text-gold border border-gold'
                    : 'border border-card-border text-warm-gray hover:border-gold'
                }`}
              >
                {amt === 0 ? 'None' : `+${fmt(amt)}`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-warm-gray">Custom:</span>
            <input
              type="number"
              className="input-field w-24"
              placeholder="0"
              value={extraMonthly || ''}
              onChange={e => handleExtraChange(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        {extraMonthly > 0 && (
          <div className="mt-3 p-3 bg-sage/10 rounded-lg text-sm">
            <span className="font-semibold">With {fmt(extraMonthly)}/mo extra:</span>{' '}
            Save <span className="text-sage font-bold">{fmt(data.avalanche_saves_vs_minimum)}</span> in interest
            and pay off <span className="font-bold">{minimum_only.months - avalanche.months} months</span> sooner (Avalanche).
          </div>
        )}
      </Card>

      {/* Strategy Comparison Chart */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-serif font-bold mb-4">Months to Payoff</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--color-warm-gray)" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-warm-gray)" width={90} />
              <Tooltip
                formatter={(val) => `${val} months`}
                contentStyle={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="months" radius={[0, 4, 4, 0]}>
                {comparisonData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="font-serif font-bold mb-4">Total Interest Paid</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--color-warm-gray)" tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-warm-gray)" width={90} />
              <Tooltip
                formatter={(val) => fmt(val)}
                contentStyle={{ background: 'var(--color-card-bg)', border: '1px solid var(--color-card-border)', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="interest" radius={[0, 4, 4, 0]}>
                {comparisonData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Debt Waterfall */}
      {waterfallData.length > 1 && (
        <Card>
          <h3 className="font-serif font-bold mb-4">Debt Waterfall — Balance Over Time</h3>
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
              <Line type="monotone" dataKey="avalanche" stroke="var(--color-terracotta)" strokeWidth={2} name="Avalanche" dot={false} />
              <Line type="monotone" dataKey="snowball" stroke="var(--color-sage)" strokeWidth={2} name="Snowball" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Payoff Order Side-by-Side */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card accent="var(--color-terracotta)">
          <h3 className="font-serif font-bold mb-1">Avalanche Order</h3>
          <p className="text-xs text-warm-gray mb-3">Highest APR first — saves the most money</p>
          <div className="space-y-2">
            {avalanche.debtResults
              .sort((a, b) => (a.paidOffMonth || 999) - (b.paidOffMonth || 999))
              .map((d, i) => (
                <div key={d.id} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-terracotta/20 text-terracotta text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <span className="text-xs">{d.type === 'loan' ? '\u{1F3E0}' : '\u{1F4B3}'}</span>
                  <span className="flex-1 truncate">{d.name}</span>
                  {d.paidOffMonth ? (
                    <Badge color="green">Month {d.paidOffMonth}</Badge>
                  ) : (
                    <Badge color="red">Not paid off</Badge>
                  )}
                </div>
              ))}
          </div>
        </Card>

        <Card accent="var(--color-sage)">
          <h3 className="font-serif font-bold mb-1">Snowball Order</h3>
          <p className="text-xs text-warm-gray mb-3">Lowest balance first — quick wins for motivation</p>
          <div className="space-y-2">
            {snowball.debtResults
              .sort((a, b) => (a.paidOffMonth || 999) - (b.paidOffMonth || 999))
              .map((d, i) => (
                <div key={d.id} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-sage/20 text-sage text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <span className="text-xs">{d.type === 'loan' ? '\u{1F3E0}' : '\u{1F4B3}'}</span>
                  <span className="flex-1 truncate">{d.name}</span>
                  {d.paidOffMonth ? (
                    <Badge color="green">Month {d.paidOffMonth}</Badge>
                  ) : (
                    <Badge color="red">Not paid off</Badge>
                  )}
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

