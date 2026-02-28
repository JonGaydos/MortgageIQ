import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { API_BASE } from '../../utils/api';
import { fmtDate } from '../../utils/formatters';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import Field from '../../components/ui/Field';

const POLICY_TYPES = [
  { value: 'home', label: 'Homeowners', icon: '\u{1F3E0}' },
  { value: 'auto', label: 'Auto', icon: '\u{1F697}' },
  { value: 'life', label: 'Life', icon: '\u{1F49A}' },
  { value: 'health', label: 'Health', icon: '\u{1FA7A}' },
  { value: 'umbrella', label: 'Umbrella', icon: '\u2602\uFE0F' },
  { value: 'renters', label: 'Renters', icon: '\u{1F3E2}' },
  { value: 'other', label: 'Other', icon: '\u{1F4CB}' },
];

const CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi-annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

export default function InsurancePage() {
  const { authFetch } = useAuth();
  const { fmt } = useCurrency();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPolicy, setEditPolicy] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [paymentForm, setPaymentForm] = useState(null);

  const loadData = async () => {
    const res = await authFetch(`${API_BASE}/insurance`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const savePolicy = async (formData) => {
    const url = editPolicy
      ? `${API_BASE}/insurance/${editPolicy.id}`
      : `${API_BASE}/insurance`;
    const res = await authFetch(url, {
      method: editPolicy ? 'PUT' : 'POST',
      body: JSON.stringify(formData),
    });
    if (res.ok) { setShowForm(false); setEditPolicy(null); loadData(); }
  };

  const deletePolicy = async (id) => {
    if (!confirm('Delete this insurance policy?')) return;
    await authFetch(`${API_BASE}/insurance/${id}`, { method: 'DELETE' });
    loadData();
  };

  const savePayment = async (policyId, paymentData) => {
    const res = await authFetch(`${API_BASE}/insurance/${policyId}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
    if (res.ok) { setPaymentForm(null); loadData(); }
  };

  const deletePayment = async (paymentId) => {
    if (!confirm('Delete this payment?')) return;
    await authFetch(`${API_BASE}/insurance/payments/${paymentId}`, { method: 'DELETE' });
    loadData();
  };

  if (loading) return <div className="text-warm-gray text-center py-12">Loading...</div>;

  const { policies, summary } = data || { policies: [], summary: {} };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-serif text-2xl font-bold">Insurance</h1>
        <Button onClick={() => { setEditPolicy(null); setShowForm(true); }}>+ Add Policy</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Policies" value={summary.total_policies || 0} />
        <StatCard label="Annual Cost" value={fmt(summary.total_annual_premium || 0)} color="var(--color-terracotta)" />
        <StatCard label="Monthly Cost" value={fmt(summary.total_monthly_cost || 0)} subtitle="All premiums combined" />
        <StatCard
          label="Renewals Soon"
          value={summary.upcoming_renewals || 0}
          color={summary.upcoming_renewals > 0 ? 'var(--color-gold)' : undefined}
          subtitle="Next 30 days"
        />
      </div>

      {/* Policy Form */}
      {showForm && (
        <PolicyForm
          policy={editPolicy}
          onSave={savePolicy}
          onCancel={() => { setShowForm(false); setEditPolicy(null); }}
        />
      )}

      {/* Policies List */}
      {policies.length === 0 ? (
        <Card>
          <p className="text-warm-gray text-center py-6">No insurance policies yet. Add your first policy to start tracking.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {policies.map(policy => {
            const typeInfo = POLICY_TYPES.find(t => t.value === policy.type) || POLICY_TYPES[6];
            const expanded = expandedId === policy.id;

            return (
              <Card key={policy.id}>
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : policy.id)}
                >
                  <span className="text-2xl">{typeInfo.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-serif font-bold">{policy.name}</div>
                    <div className="text-xs text-warm-gray">
                      {typeInfo.label} {policy.provider && `\u2022 ${policy.provider}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-serif font-bold">{fmt(policy.premium)}</div>
                    <div className="text-xs text-warm-gray">/{policy.premium_cycle}</div>
                  </div>
                  {policy.renewal_soon && <Badge color="orange">Renewal Soon</Badge>}
                  <span className="text-warm-gray text-xs">{expanded ? '\u25B2' : '\u25BC'}</span>
                </div>

                {expanded && (
                  <ExpandedPolicy
                    policy={policy}
                    fmt={fmt}
                    authFetch={authFetch}
                    onEdit={() => { setEditPolicy(policy); setShowForm(true); }}
                    onDelete={() => deletePolicy(policy.id)}
                    paymentForm={paymentForm}
                    setPaymentForm={setPaymentForm}
                    onSavePayment={savePayment}
                    onDeletePayment={deletePayment}
                  />
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExpandedPolicy({ policy, fmt, authFetch, onEdit, onDelete, paymentForm, setPaymentForm, onSavePayment, onDeletePayment }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    authFetch(`${API_BASE}/insurance/${policy.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setDetail(d));
  }, [policy.id]);

  if (!detail) return <div className="text-warm-gray text-xs mt-3">Loading details...</div>;

  return (
    <div className="mt-4 pt-4 border-t border-card-border space-y-4">
      {/* Details grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {policy.policy_number && (
          <div><span className="text-xs text-warm-gray block">Policy #</span>{policy.policy_number}</div>
        )}
        {policy.coverage_amount && (
          <div><span className="text-xs text-warm-gray block">Coverage</span>{fmt(policy.coverage_amount)}</div>
        )}
        {policy.deductible && (
          <div><span className="text-xs text-warm-gray block">Deductible</span>{fmt(policy.deductible)}</div>
        )}
        {policy.renewal_date && (
          <div>
            <span className="text-xs text-warm-gray block">Renewal Date</span>
            {fmtDate(policy.renewal_date)}
            {policy.days_to_renewal !== null && (
              <span className="text-xs text-warm-gray ml-1">({policy.days_to_renewal}d)</span>
            )}
          </div>
        )}
        <div><span className="text-xs text-warm-gray block">Total Paid</span>{fmt(detail.total_paid)}</div>
      </div>

      {/* Payment history */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Payments ({detail.payments.length})</h4>
        <Button variant="sm" className="border border-gold text-gold hover:bg-gold/10" onClick={() => setPaymentForm(policy.id)}>
          + Payment
        </Button>
      </div>

      {paymentForm === policy.id && (
        <PaymentMiniForm
          onSave={(d) => onSavePayment(policy.id, d)}
          onCancel={() => setPaymentForm(null)}
        />
      )}

      {detail.payments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border">
                <th className="text-left px-2 py-1.5 text-xs font-semibold uppercase text-warm-gray">Date</th>
                <th className="text-right px-2 py-1.5 text-xs font-semibold uppercase text-warm-gray">Amount</th>
                <th className="text-center px-2 py-1.5 text-xs font-semibold uppercase text-warm-gray">Period</th>
                <th className="text-center px-2 py-1.5 text-xs font-semibold uppercase text-warm-gray"></th>
              </tr>
            </thead>
            <tbody>
              {detail.payments.slice(0, 10).map(p => (
                <tr key={p.id} className="border-b border-card-border">
                  <td className="px-2 py-1.5">{fmtDate(p.payment_date)}</td>
                  <td className="px-2 py-1.5 text-right font-semibold">{fmt(p.amount)}</td>
                  <td className="px-2 py-1.5 text-center text-xs text-warm-gray">
                    {p.period_start && p.period_end ? `${fmtDate(p.period_start)} - ${fmtDate(p.period_end)}` : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button onClick={() => onDeletePayment(p.id)} className="text-xs text-warm-gray hover:text-danger">Del</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={onEdit} className="text-xs">Edit Policy</Button>
        <Button variant="danger" onClick={onDelete} className="text-xs">Delete</Button>
      </div>
    </div>
  );
}

function PaymentMiniForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ payment_date: new Date().toISOString().split('T')[0], amount: '', notes: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount) return;
    onSave({ ...form, amount: parseFloat(form.amount) });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 flex-wrap bg-cream/30 p-3 rounded-lg">
      <Field label="Date">
        <input type="date" className="input-field w-36" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} />
      </Field>
      <Field label="Amount">
        <input type="number" step="0.01" className="input-field w-28" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
      </Field>
      <Field label="Notes">
        <input type="text" className="input-field w-40" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      </Field>
      <Button type="submit">Save</Button>
      <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
    </form>
  );
}

function PolicyForm({ policy, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: policy?.name || '',
    type: policy?.type || 'home',
    provider: policy?.provider || '',
    policy_number: policy?.policy_number || '',
    coverage_amount: policy?.coverage_amount || '',
    deductible: policy?.deductible || '',
    premium: policy?.premium || '',
    premium_cycle: policy?.premium_cycle || 'monthly',
    start_date: policy?.start_date || '',
    renewal_date: policy?.renewal_date || '',
    auto_renew: policy?.auto_renew ?? 1,
    notes: policy?.notes || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) return;
    onSave({
      ...form,
      coverage_amount: form.coverage_amount ? parseFloat(form.coverage_amount) : null,
      deductible: form.deductible ? parseFloat(form.deductible) : null,
      premium: parseFloat(form.premium) || 0,
    });
  };

  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <Card>
      <h3 className="font-serif font-bold mb-4">{policy ? 'Edit Policy' : 'New Insurance Policy'}</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Policy Name *">
          <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. State Farm Homeowners" />
        </Field>
        <Field label="Type">
          <select className="input-field" value={form.type} onChange={e => set('type', e.target.value)}>
            {POLICY_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
          </select>
        </Field>
        <Field label="Provider">
          <input className="input-field" value={form.provider} onChange={e => set('provider', e.target.value)} placeholder="e.g. State Farm" />
        </Field>
        <Field label="Policy Number">
          <input className="input-field" value={form.policy_number} onChange={e => set('policy_number', e.target.value)} />
        </Field>
        <Field label="Coverage Amount">
          <input type="number" step="0.01" className="input-field" value={form.coverage_amount} onChange={e => set('coverage_amount', e.target.value)} />
        </Field>
        <Field label="Deductible">
          <input type="number" step="0.01" className="input-field" value={form.deductible} onChange={e => set('deductible', e.target.value)} />
        </Field>
        <Field label="Premium *">
          <input type="number" step="0.01" className="input-field" value={form.premium} onChange={e => set('premium', e.target.value)} />
        </Field>
        <Field label="Premium Cycle">
          <select className="input-field" value={form.premium_cycle} onChange={e => set('premium_cycle', e.target.value)}>
            {CYCLES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Start Date">
          <input type="date" className="input-field" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </Field>
        <Field label="Renewal Date">
          <input type="date" className="input-field" value={form.renewal_date} onChange={e => set('renewal_date', e.target.value)} />
        </Field>
        <Field label="Auto-Renew">
          <label className="flex items-center gap-2 mt-1">
            <input type="checkbox" checked={!!form.auto_renew} onChange={e => set('auto_renew', e.target.checked ? 1 : 0)} />
            <span className="text-sm">Auto-renews</span>
          </label>
        </Field>
        <Field label="Notes" className="md:col-span-2 lg:col-span-3">
          <textarea className="input-field" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </Field>
        <div className="flex gap-3 md:col-span-2 lg:col-span-3">
          <Button type="submit">{policy ? 'Update' : 'Add Policy'}</Button>
          <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
