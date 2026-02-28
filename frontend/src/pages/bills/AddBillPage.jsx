import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { API_BASE } from '../../utils/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import DocumentAttachment from '../../components/DocumentAttachment';

const BILL_TYPES = [
  { value: 'utility', label: 'Utility Bill', icon: '\u{1F4A1}', description: 'Electric, water, gas, internet, etc.' },
  { value: 'loan', label: 'Loan Payment', icon: '\u{1F3E0}', description: 'Mortgage, auto, personal loan payments' },
  { value: 'insurance', label: 'Insurance Premium', icon: '\u{1F6E1}\uFE0F', description: 'Home, auto, health, life insurance' },
];

export default function AddBillPage() {
  const { authFetch } = useAuth();
  const { fmt } = useCurrency();
  const navigate = useNavigate();
  const [billType, setBillType] = useState(null);
  const [loans, setLoans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  // After-save state for document attachment
  const [savedEntry, setSavedEntry] = useState(null); // { type, id, redirectUrl }

  // Loan payment form
  const [loanForm, setLoanForm] = useState({
    loan_id: '', payment_date: new Date().toISOString().split('T')[0],
    total_payment: '', principal: '', interest: '', escrow: '', extra_principal: '', notes: '',
  });

  // Utility bill form
  const [utilityForm, setUtilityForm] = useState({
    category_id: '', amount: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    usage_amount: '', notes: '',
  });

  // Insurance payment form
  const [insuranceForm, setInsuranceForm] = useState({
    policy_id: '', amount: '', payment_date: new Date().toISOString().split('T')[0], notes: '',
  });

  useEffect(() => {
    Promise.all([
      authFetch(`${API_BASE}/loans`).then(r => r.ok ? r.json() : []),
      authFetch(`${API_BASE}/bill-categories`).then(r => r.ok ? r.json() : []),
      authFetch(`${API_BASE}/insurance`).then(r => r.ok ? r.json() : []),
    ]).then(([loansData, catsData, insData]) => {
      setLoans(loansData);
      setCategories(catsData);
      setPolicies(insData);
      setLoading(false);
    });
  }, []);

  const handleLoanPayment = async () => {
    if (!loanForm.loan_id || !loanForm.payment_date) return;
    const data = { ...loanForm };
    if (!data.total_payment) {
      data.total_payment = (parseFloat(data.principal) || 0) + (parseFloat(data.interest) || 0) +
        (parseFloat(data.escrow) || 0) + (parseFloat(data.extra_principal) || 0);
    }
    const res = await authFetch(`${API_BASE}/payments/loan/${loanForm.loan_id}`, {
      method: 'POST', body: JSON.stringify(data),
    });
    if (res.ok) {
      const result = await res.json();
      setSavedEntry({
        type: 'loan_payment',
        id: result.id,
        category: 'mortgage',
        redirectUrl: `/loans/${loanForm.loan_id}/payments`,
        label: 'Loan Payment',
      });
    }
  };

  const handleUtilityBill = async () => {
    if (!utilityForm.category_id || !utilityForm.amount || !utilityForm.bill_date) return;
    const res = await authFetch(`${API_BASE}/bills`, {
      method: 'POST', body: JSON.stringify(utilityForm),
    });
    if (res.ok) {
      const result = await res.json();
      setSavedEntry({
        type: 'bill',
        id: result.id,
        category: 'utilities',
        redirectUrl: `/bills/${utilityForm.category_id}`,
        label: 'Utility Bill',
      });
    }
  };

  const handleInsurancePayment = async () => {
    if (!insuranceForm.policy_id || !insuranceForm.amount) return;
    const res = await authFetch(`${API_BASE}/insurance/${insuranceForm.policy_id}/payments`, {
      method: 'POST', body: JSON.stringify(insuranceForm),
    });
    if (res.ok) {
      const result = await res.json();
      setSavedEntry({
        type: 'insurance_payment',
        id: result.id,
        category: 'insurance',
        redirectUrl: '/insurance',
        label: 'Insurance Payment',
      });
    }
  };

  if (loading) return <div className="text-warm-gray text-center py-12">Loading...</div>;

  // After saving, show success + document attachment
  if (savedEntry) {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-2xl font-bold">Add Bill</h1>
        <Card accent="var(--color-sage)">
          <div className="text-center py-4">
            <div className="text-3xl mb-2">{'\u2705'}</div>
            <h3 className="font-serif font-bold text-lg">{savedEntry.label} Saved!</h3>
            <p className="text-sm text-warm-gray mt-1">
              You can now attach documents, upload a PDF for AI processing, or link a Paperless-NGX URL.
            </p>
          </div>

          <DocumentAttachment
            linkedType={savedEntry.type}
            linkedId={savedEntry.id}
            category={savedEntry.category}
          />

          <div className="flex gap-3 mt-4 justify-center">
            <Button onClick={() => navigate(savedEntry.redirectUrl)}>
              View Details
            </Button>
            <Button variant="outline" onClick={() => {
              setSavedEntry(null);
              setBillType(null);
              setLoanForm({ loan_id: '', payment_date: new Date().toISOString().split('T')[0], total_payment: '', principal: '', interest: '', escrow: '', extra_principal: '', notes: '' });
              setUtilityForm({ category_id: '', amount: '', bill_date: new Date().toISOString().split('T')[0], due_date: '', usage_amount: '', notes: '' });
              setInsuranceForm({ policy_id: '', amount: '', payment_date: new Date().toISOString().split('T')[0], notes: '' });
            }}>
              Add Another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">Add Bill</h1>

      {/* Bill Type Selection */}
      {!billType && (
        <div className="grid md:grid-cols-3 gap-4">
          {BILL_TYPES.map(type => (
            <Card
              key={type.value}
              className="cursor-pointer hover:ring-2 hover:ring-gold/50 transition-all"
              onClick={() => setBillType(type.value)}
            >
              <div className="text-center py-4">
                <div className="text-3xl mb-2">{type.icon}</div>
                <h3 className="font-serif font-bold text-lg">{type.label}</h3>
                <p className="text-xs text-warm-gray mt-1">{type.description}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Loan Payment Form */}
      {billType === 'loan' && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setBillType(null)} className="text-sm text-warm-gray hover:text-gold">&larr;</button>
            <h3 className="font-serif font-bold">{'\u{1F3E0}'} Record Loan Payment</h3>
          </div>
          {loans.length === 0 ? (
            <p className="text-warm-gray text-sm">No loans found. <button onClick={() => navigate('/loans')} className="text-gold hover:underline">Add a loan first</button></p>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Select Loan *">
                  <select className="input-field" value={loanForm.loan_id} onChange={e => setLoanForm(f => ({ ...f, loan_id: e.target.value }))}>
                    <option value="">Choose a loan...</option>
                    {loans.map(l => <option key={l.id} value={l.id}>{l.name} ({fmt(l.current_balance || l.original_amount)})</option>)}
                  </select>
                </Field>
                <Field label="Payment Date"><input type="date" className="input-field" value={loanForm.payment_date} onChange={e => setLoanForm(f => ({ ...f, payment_date: e.target.value }))} /></Field>
                <Field label="Principal"><input type="number" step="0.01" className="input-field" placeholder="0.00" value={loanForm.principal} onChange={e => setLoanForm(f => ({ ...f, principal: e.target.value }))} /></Field>
                <Field label="Interest"><input type="number" step="0.01" className="input-field" placeholder="0.00" value={loanForm.interest} onChange={e => setLoanForm(f => ({ ...f, interest: e.target.value }))} /></Field>
                <Field label="Escrow"><input type="number" step="0.01" className="input-field" placeholder="0.00" value={loanForm.escrow} onChange={e => setLoanForm(f => ({ ...f, escrow: e.target.value }))} /></Field>
                <Field label="Extra Principal"><input type="number" step="0.01" className="input-field" placeholder="0.00" value={loanForm.extra_principal} onChange={e => setLoanForm(f => ({ ...f, extra_principal: e.target.value }))} /></Field>
                <Field label="Total Payment"><input type="number" step="0.01" className="input-field" placeholder="Auto-calculated" value={loanForm.total_payment} onChange={e => setLoanForm(f => ({ ...f, total_payment: e.target.value }))} /></Field>
                <Field label="Notes"><input type="text" className="input-field" placeholder="Optional" value={loanForm.notes} onChange={e => setLoanForm(f => ({ ...f, notes: e.target.value }))} /></Field>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleLoanPayment}>Save Loan Payment</Button>
                <Button variant="ghost" onClick={() => setBillType(null)}>Cancel</Button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Utility Bill Form */}
      {billType === 'utility' && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setBillType(null)} className="text-sm text-warm-gray hover:text-gold">&larr;</button>
            <h3 className="font-serif font-bold">{'\u{1F4A1}'} Add Utility Bill</h3>
          </div>
          {categories.length === 0 ? (
            <p className="text-warm-gray text-sm">No utility categories found. <button onClick={() => navigate('/bills')} className="text-gold hover:underline">Create a category first</button></p>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Category *">
                  <select className="input-field" value={utilityForm.category_id} onChange={e => setUtilityForm(f => ({ ...f, category_id: e.target.value }))}>
                    <option value="">Choose category...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </Field>
                <Field label="Amount *"><input type="number" step="0.01" className="input-field" placeholder="0.00" value={utilityForm.amount} onChange={e => setUtilityForm(f => ({ ...f, amount: e.target.value }))} /></Field>
                <Field label="Bill Date *"><input type="date" className="input-field" value={utilityForm.bill_date} onChange={e => setUtilityForm(f => ({ ...f, bill_date: e.target.value }))} /></Field>
                <Field label="Due Date"><input type="date" className="input-field" value={utilityForm.due_date} onChange={e => setUtilityForm(f => ({ ...f, due_date: e.target.value }))} /></Field>
                <Field label="Usage"><input type="number" step="0.01" className="input-field" placeholder="e.g. 850 kWh" value={utilityForm.usage_amount} onChange={e => setUtilityForm(f => ({ ...f, usage_amount: e.target.value }))} /></Field>
                <Field label="Notes"><input type="text" className="input-field" placeholder="Optional" value={utilityForm.notes} onChange={e => setUtilityForm(f => ({ ...f, notes: e.target.value }))} /></Field>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleUtilityBill}>Save Utility Bill</Button>
                <Button variant="ghost" onClick={() => setBillType(null)}>Cancel</Button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Insurance Payment Form */}
      {billType === 'insurance' && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setBillType(null)} className="text-sm text-warm-gray hover:text-gold">&larr;</button>
            <h3 className="font-serif font-bold">{'\u{1F6E1}\uFE0F'} Record Insurance Payment</h3>
          </div>
          {policies.length === 0 ? (
            <p className="text-warm-gray text-sm">No policies found. <button onClick={() => navigate('/insurance')} className="text-gold hover:underline">Add a policy first</button></p>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Policy *">
                  <select className="input-field" value={insuranceForm.policy_id} onChange={e => setInsuranceForm(f => ({ ...f, policy_id: e.target.value }))}>
                    <option value="">Choose policy...</option>
                    {policies.map(p => <option key={p.id} value={p.id}>{p.name} ({p.policy_type})</option>)}
                  </select>
                </Field>
                <Field label="Amount *"><input type="number" step="0.01" className="input-field" placeholder="0.00" value={insuranceForm.amount} onChange={e => setInsuranceForm(f => ({ ...f, amount: e.target.value }))} /></Field>
                <Field label="Payment Date"><input type="date" className="input-field" value={insuranceForm.payment_date} onChange={e => setInsuranceForm(f => ({ ...f, payment_date: e.target.value }))} /></Field>
                <Field label="Notes"><input type="text" className="input-field" placeholder="Optional" value={insuranceForm.notes} onChange={e => setInsuranceForm(f => ({ ...f, notes: e.target.value }))} /></Field>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleInsurancePayment}>Save Insurance Payment</Button>
                <Button variant="ghost" onClick={() => setBillType(null)}>Cancel</Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
