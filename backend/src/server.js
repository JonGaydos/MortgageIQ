import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || '/data';
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'mortgage.db');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    original_amount REAL NOT NULL,
    interest_rate REAL NOT NULL,
    loan_term_months INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    monthly_payment REAL NOT NULL,
    current_balance REAL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
    payment_date TEXT NOT NULL,
    total_payment REAL NOT NULL,
    principal REAL NOT NULL DEFAULT 0,
    interest REAL NOT NULL DEFAULT 0,
    escrow REAL NOT NULL DEFAULT 0,
    extra_principal REAL NOT NULL DEFAULT 0,
    ending_balance REAL,
    statement_month TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS escrow_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    payment_date TEXT,
    year INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

console.log('Database initialized at ' + DB_PATH);

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .run(key, value);
}

function updateLoanBalance(loanId) {
  const latest = db.prepare(
    'SELECT ending_balance FROM payments WHERE loan_id = ? ORDER BY payment_date DESC LIMIT 1'
  ).get(loanId);
  if (latest) {
    db.prepare('UPDATE loans SET current_balance = ? WHERE id = ?').run(latest.ending_balance, loanId);
  }
}

const PDF_PROMPT = `Extract mortgage payment information from this statement. Return ONLY a raw JSON object with no markdown, no code blocks, no backticks, no explanation. Just the JSON object itself starting with { and ending with }.

Use this exact structure:
{
  "payment_date": "YYYY-MM-DD",
  "statement_month": "YYYY-MM",
  "total_payment": 0.00,
  "principal": 0.00,
  "interest": 0.00,
  "escrow": 0.00,
  "extra_principal": 0.00,
  "ending_balance": 0.00,
  "notes": ""
}

Use null for any values not found. Return only the JSON object, nothing else.`;

function parseAIResponse(text) {
  return JSON.parse(text.trim().replace(/\`\`\`json|\`\`\`/g, '').trim());
}

async function extractWithClaude(apiKey, base64PDF) {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-opus-4-6', max_tokens: 1024,
    messages: [{ role: 'user', content: [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64PDF } },
      { type: 'text', text: PDF_PROMPT }
    ]}]
  });
  return parseAIResponse(response.content[0].text);
}

async function extractWithOpenAI(apiKey, base64PDF) {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: 'gpt-4o', max_tokens: 1024,
    messages: [{ role: 'user', content: [
      { type: 'file', file: { filename: 'statement.pdf', file_data: 'data:application/pdf;base64,' + base64PDF } },
      { type: 'text', text: PDF_PROMPT }
    ]}]
  });
  return parseAIResponse(response.choices[0].message.content);
}

async function extractWithGemini(apiKey, base64PDF) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent([
    { inlineData: { mimeType: 'application/pdf', data: base64PDF } },
    PDF_PROMPT
  ]);
  return parseAIResponse(result.response.text());
}

async function extractWithCopilot(apiKey, base64PDF) {
  const client = new OpenAI({ apiKey, baseURL: 'https://models.inference.ai.azure.com' });
  const response = await client.chat.completions.create({
    model: 'gpt-4o', max_tokens: 1024,
    messages: [{ role: 'user', content: [
      { type: 'file', file: { filename: 'statement.pdf', file_data: 'data:application/pdf;base64,' + base64PDF } },
      { type: 'text', text: PDF_PROMPT }
    ]}]
  });
  return parseAIResponse(response.choices[0].message.content);
}

const app = express();
app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// SETTINGS
app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  ['claude_api_key','openai_api_key','gemini_api_key','copilot_api_key'].forEach(k => {
    if (settings[k]) settings[k] = '••••••••••••••••';
  });
  res.json(settings);
});

app.post('/api/settings', (req, res) => {
  const allowed = ['claude_api_key','openai_api_key','gemini_api_key','copilot_api_key'];
  const updates = [];
  for (const [key, value] of Object.entries(req.body)) {
    if (!allowed.includes(key)) continue;
    if (value && value !== '••••••••••••••••') { setSetting(key, value); updates.push(key); }
  }
  res.json({ success: true, updated: updates });
});

app.delete('/api/settings/:key', (req, res) => {
  const allowed = ['claude_api_key','openai_api_key','gemini_api_key','copilot_api_key'];
  if (!allowed.includes(req.params.key)) return res.status(400).json({ error: 'Invalid key' });
  db.prepare('DELETE FROM settings WHERE key = ?').run(req.params.key);
  res.json({ success: true });
});

// LOANS
app.get('/api/loans', (req, res) => res.json(db.prepare('SELECT * FROM loans ORDER BY created_at DESC').all()));

app.post('/api/loans', (req, res) => {
  const { name, original_amount, interest_rate, loan_term_months, start_date, monthly_payment } = req.body;
  const result = db.prepare(
    'INSERT INTO loans (name, original_amount, interest_rate, loan_term_months, start_date, monthly_payment, current_balance) VALUES (?,?,?,?,?,?,?)'
  ).run(name, original_amount, interest_rate, loan_term_months, start_date, monthly_payment, original_amount);
  res.json(db.prepare('SELECT * FROM loans WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/loans/:id', (req, res) => {
  const { name, original_amount, interest_rate, loan_term_months, start_date, monthly_payment } = req.body;
  db.prepare('UPDATE loans SET name=?,original_amount=?,interest_rate=?,loan_term_months=?,start_date=?,monthly_payment=? WHERE id=?')
    .run(name, original_amount, interest_rate, loan_term_months, start_date, monthly_payment, req.params.id);
  res.json(db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id));
});

app.delete('/api/loans/:id', (req, res) => { db.prepare('DELETE FROM loans WHERE id = ?').run(req.params.id); res.json({ success: true }); });

// PAYMENTS
app.get('/api/loans/:id/payments', (req, res) =>
  res.json(db.prepare('SELECT * FROM payments WHERE loan_id = ? ORDER BY payment_date ASC').all(req.params.id)));

app.post('/api/loans/:id/payments', (req, res) => {
  const { payment_date, total_payment, principal, interest, escrow, extra_principal, ending_balance, statement_month, notes } = req.body;
  const result = db.prepare(
    'INSERT INTO payments (loan_id,payment_date,total_payment,principal,interest,escrow,extra_principal,ending_balance,statement_month,notes) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).run(req.params.id, payment_date, total_payment, principal, interest, escrow, extra_principal, ending_balance, statement_month, notes);
  updateLoanBalance(req.params.id);
  res.json(db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/payments/:id', (req, res) => {
  const { payment_date, total_payment, principal, interest, escrow, extra_principal, ending_balance, statement_month, notes } = req.body;
  db.prepare('UPDATE payments SET payment_date=?,total_payment=?,principal=?,interest=?,escrow=?,extra_principal=?,ending_balance=?,statement_month=?,notes=? WHERE id=?')
    .run(payment_date, total_payment, principal, interest, escrow, extra_principal, ending_balance, statement_month, notes, req.params.id);
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
  if (payment) updateLoanBalance(payment.loan_id);
  res.json(payment);
});

app.delete('/api/payments/:id', (req, res) => {
  const payment = db.prepare('SELECT loan_id FROM payments WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
  if (payment) updateLoanBalance(payment.loan_id);
  res.json({ success: true });
});

// ESCROW
app.get('/api/loans/:id/escrow', (req, res) =>
  res.json(db.prepare('SELECT * FROM escrow_items WHERE loan_id = ? ORDER BY payment_date DESC').all(req.params.id)));

app.post('/api/loans/:id/escrow', (req, res) => {
  const { item_type, description, amount, payment_date, year } = req.body;
  const result = db.prepare('INSERT INTO escrow_items (loan_id,item_type,description,amount,payment_date,year) VALUES (?,?,?,?,?,?)')
    .run(req.params.id, item_type, description, amount, payment_date, year);
  res.json(db.prepare('SELECT * FROM escrow_items WHERE id = ?').get(result.lastInsertRowid));
});

app.delete('/api/escrow/:id', (req, res) => { db.prepare('DELETE FROM escrow_items WHERE id = ?').run(req.params.id); res.json({ success: true }); });

// ANALYTICS
app.get('/api/loans/:id/analytics', (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  const payments = db.prepare('SELECT * FROM payments WHERE loan_id = ? ORDER BY payment_date ASC').all(req.params.id);
  const totalPaid = payments.reduce((s, p) => s + p.total_payment, 0);
  const totalPrincipalPaid = payments.reduce((s, p) => s + p.principal + p.extra_principal, 0);
  const totalInterestPaid = payments.reduce((s, p) => s + p.interest, 0);
  const totalEscrowPaid = payments.reduce((s, p) => s + p.escrow, 0);
  const mostRecent = [...payments].sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0];
  const currentBalance = mostRecent?.ending_balance ?? (loan.original_amount - totalPrincipalPaid);
  const monthlyRate = loan.interest_rate / 100 / 12;
  let projectedMonths = 0, remaining = currentBalance, projectedInterest = 0;
  while (remaining > 0.01 && projectedMonths < 600) {
    const ic = remaining * monthlyRate;
    remaining -= Math.min(loan.monthly_payment - ic, remaining);
    projectedInterest += ic; projectedMonths++;
  }
  const lastDate = mostRecent ? new Date(mostRecent.payment_date) : new Date(loan.start_date);
  const projectedPayoffDate = new Date(lastDate);
  projectedPayoffDate.setMonth(projectedPayoffDate.getMonth() + projectedMonths);
  let origBalance = loan.original_amount, origInterest = 0, origMonths = 0;
  while (origBalance > 0.01 && origMonths < 600) {
    const ic = origBalance * monthlyRate; origBalance -= (loan.monthly_payment - ic); origInterest += ic; origMonths++;
  }
  res.json({ loan, totalPaid, totalPrincipalPaid, totalInterestPaid, totalEscrowPaid, currentBalance, projectedMonths,
    projectedPayoffDate: projectedPayoffDate.toISOString().split('T')[0], projectedRemainingInterest: projectedInterest,
    originalLoanTermMonths: loan.loan_term_months, originalTotalInterest: origInterest,
    monthsAhead: loan.loan_term_months - payments.length - projectedMonths, paymentCount: payments.length });
});

// PAYOFF CALCULATOR
app.post('/api/loans/:id/calculate-payoff', (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  const currentBalance = loan.current_balance || loan.original_amount;
  const monthlyRate = loan.interest_rate / 100 / 12;
  const basePayment = loan.monthly_payment;
  const extraMonthly = parseFloat(req.body.extra_monthly) || 0;
  const lumpSum = parseFloat(req.body.lump_sum) || 0;
  const calc = (startBalance, payment) => {
    let balance = startBalance, months = 0, totalInterest = 0;
    while (balance > 0.01 && months < 600) {
      const interest = balance * monthlyRate;
      balance -= Math.min(payment - interest, balance);
      totalInterest += interest; months++;
    }
    return { months, totalInterest };
  };
  const now = new Date();
  const payoffDate = (months) => { const d = new Date(now); d.setMonth(d.getMonth() + months); return d.toISOString().split('T')[0]; };
  const base = calc(currentBalance, basePayment);
  const monthly = calc(currentBalance, basePayment + extraMonthly);
  const lump = calc(Math.max(0, currentBalance - lumpSum), basePayment);
  const combined = calc(Math.max(0, currentBalance - lumpSum), basePayment + extraMonthly);
  res.json({
    base: { months: base.months, totalInterest: base.totalInterest, payoffDate: payoffDate(base.months) },
    monthly: { months: monthly.months, totalInterest: monthly.totalInterest, payoffDate: payoffDate(monthly.months) },
    lump: { months: lump.months, totalInterest: lump.totalInterest, payoffDate: payoffDate(lump.months) },
    combined: { months: combined.months, totalInterest: combined.totalInterest, payoffDate: payoffDate(combined.months) },
    savings: {
      monthly: { months: base.months - monthly.months, interest: base.totalInterest - monthly.totalInterest },
      lump: { months: base.months - lump.months, interest: base.totalInterest - lump.totalInterest },
      combined: { months: base.months - combined.months, interest: base.totalInterest - combined.totalInterest },
    }
  });
});

// PDF PROCESSING
app.post('/api/loans/:id/process-pdf', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });
  const provider = req.body.provider || 'claude';
  const keyMap = { claude: 'claude_api_key', openai: 'openai_api_key', gemini: 'gemini_api_key', copilot: 'copilot_api_key' };
  const apiKey = getSetting(keyMap[provider]);
  if (!apiKey) {
    try { fs.unlinkSync(req.file.path); } catch (e) {}
    return res.status(400).json({ error: 'No API key configured for ' + provider + '. Go to Settings to add one.' });
  }
  try {
    const base64PDF = fs.readFileSync(req.file.path).toString('base64');
    let data;
    if (provider === 'claude') data = await extractWithClaude(apiKey, base64PDF);
    else if (provider === 'openai') data = await extractWithOpenAI(apiKey, base64PDF);
    else if (provider === 'gemini') data = await extractWithGemini(apiKey, base64PDF);
    else if (provider === 'copilot') data = await extractWithCopilot(apiKey, base64PDF);
    else throw new Error('Unknown provider');
    try { fs.unlinkSync(req.file.path); } catch (e) {}
    res.json({ success: true, extracted: data, provider });
  } catch (err) {
    console.error('PDF processing error (' + provider + '):', err);
    try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch (e) {}
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('MortgageIQ backend running on port ' + PORT));
