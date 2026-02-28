import { Router } from 'express';
import db from '../db/index.js';
import { auth } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// ─── Policies ────────────────────────────────────────

// GET /api/insurance — list all policies with enriched data
router.get('/', (req, res) => {
  const policies = db.prepare('SELECT * FROM insurance_policies ORDER BY renewal_date ASC').all();

  const enriched = policies.map(p => {
    const agg = db.prepare(`
      SELECT COUNT(*) as payment_count,
        SUM(amount) as total_paid,
        MAX(payment_date) as last_payment
      FROM insurance_payments WHERE policy_id = ?
    `).get(p.id);

    const daysToRenewal = p.renewal_date
      ? Math.ceil((new Date(p.renewal_date) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      ...p,
      payment_count: agg.payment_count,
      total_paid: Math.round((agg.total_paid || 0) * 100) / 100,
      last_payment: agg.last_payment,
      days_to_renewal: daysToRenewal,
      renewal_soon: daysToRenewal !== null && daysToRenewal <= 30 && daysToRenewal >= 0,
    };
  });

  // Summary stats
  const totalAnnualPremium = policies.reduce((s, p) => {
    const prem = parseFloat(p.premium) || 0;
    if (p.premium_cycle === 'annual') return s + prem;
    if (p.premium_cycle === 'semi-annual') return s + prem * 2;
    if (p.premium_cycle === 'quarterly') return s + prem * 4;
    return s + prem * 12; // monthly
  }, 0);

  const upcoming = enriched.filter(p => p.renewal_soon).length;

  res.json({
    policies: enriched,
    summary: {
      total_policies: policies.length,
      total_annual_premium: Math.round(totalAnnualPremium * 100) / 100,
      total_monthly_cost: Math.round((totalAnnualPremium / 12) * 100) / 100,
      upcoming_renewals: upcoming,
    },
  });
});

// GET /api/insurance/:id
router.get('/:id', (req, res) => {
  const policy = db.prepare('SELECT * FROM insurance_policies WHERE id = ?').get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Not found' });

  const payments = db.prepare(
    'SELECT * FROM insurance_payments WHERE policy_id = ? ORDER BY payment_date DESC'
  ).all(req.params.id);

  const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  // Monthly cost history for charts
  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', payment_date) as month,
      SUM(amount) as total
    FROM insurance_payments
    WHERE policy_id = ?
    GROUP BY month
    ORDER BY month DESC
    LIMIT 24
  `).all(req.params.id).reverse();

  res.json({ policy, payments, total_paid: Math.round(totalPaid * 100) / 100, monthly });
});

// POST /api/insurance
router.post('/', (req, res) => {
  const { name, type, provider, policy_number, coverage_amount, deductible, premium, premium_cycle, start_date, renewal_date, auto_renew, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const result = db.prepare(`
    INSERT INTO insurance_policies (name, type, provider, policy_number, coverage_amount, deductible, premium, premium_cycle, start_date, renewal_date, auto_renew, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, type || 'home', provider, policy_number, coverage_amount, deductible, premium || 0, premium_cycle || 'monthly', start_date, renewal_date, auto_renew ?? 1, notes);

  res.json({ id: result.lastInsertRowid });
});

// PUT /api/insurance/:id
router.put('/:id', (req, res) => {
  const { name, type, provider, policy_number, coverage_amount, deductible, premium, premium_cycle, start_date, renewal_date, auto_renew, notes } = req.body;

  db.prepare(`
    UPDATE insurance_policies
    SET name=?, type=?, provider=?, policy_number=?, coverage_amount=?, deductible=?, premium=?, premium_cycle=?, start_date=?, renewal_date=?, auto_renew=?, notes=?
    WHERE id=?
  `).run(name, type, provider, policy_number, coverage_amount, deductible, premium, premium_cycle, start_date, renewal_date, auto_renew, notes, req.params.id);

  res.json({ success: true });
});

// DELETE /api/insurance/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM insurance_policies WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Payments ────────────────────────────────────────

// POST /api/insurance/:id/payments
router.post('/:id/payments', (req, res) => {
  const { payment_date, amount, period_start, period_end, notes } = req.body;
  if (!payment_date || !amount) return res.status(400).json({ error: 'Date and amount required' });

  const result = db.prepare(`
    INSERT INTO insurance_payments (policy_id, payment_date, amount, period_start, period_end, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.params.id, payment_date, amount, period_start, period_end, notes);

  res.json({ id: result.lastInsertRowid });
});

// DELETE /api/insurance/payments/:paymentId
router.delete('/payments/:paymentId', (req, res) => {
  db.prepare('DELETE FROM insurance_payments WHERE id = ?').run(req.params.paymentId);
  res.json({ success: true });
});

// ─── Dashboard summary ──────────────────────────────

// GET /api/insurance/dashboard
router.get('/dashboard/summary', (req, res) => {
  const policies = db.prepare('SELECT * FROM insurance_policies').all();
  const upcoming = policies.filter(p => {
    if (!p.renewal_date) return false;
    const days = Math.ceil((new Date(p.renewal_date) - new Date()) / (1000 * 60 * 60 * 24));
    return days <= 30 && days >= 0;
  });

  res.json({
    policy_count: policies.length,
    upcoming_renewals: upcoming.map(p => ({ id: p.id, name: p.name, renewal_date: p.renewal_date, type: p.type })),
  });
});

export default router;
