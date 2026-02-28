import { Router } from 'express';
import db from '../db/index.js';
import { auth } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// ─── Tasks ───────────────────────────────────────────

// GET /api/maintenance/tasks — list all tasks
router.get('/tasks', (req, res) => {
  const { status, category } = req.query;
  let sql = 'SELECT * FROM maintenance_tasks';
  const params = [];
  const conditions = [];

  if (status) { conditions.push('status = ?'); params.push(status); }
  if (category) { conditions.push('category = ?'); params.push(category); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY CASE WHEN next_due IS NULL THEN 1 ELSE 0 END, next_due ASC';

  const tasks = db.prepare(sql).all(...params);

  // Enrich with log counts and total spent
  const enriched = tasks.map(t => {
    const agg = db.prepare(`
      SELECT COUNT(*) as log_count, SUM(cost) as total_cost
      FROM maintenance_logs WHERE task_id = ?
    `).get(t.id);

    const overdue = t.next_due && new Date(t.next_due) < new Date() && t.status !== 'completed';

    return {
      ...t,
      log_count: agg.log_count,
      total_spent: Math.round((agg.total_cost || 0) * 100) / 100,
      overdue,
    };
  });

  const overdueCount = enriched.filter(t => t.overdue).length;
  const totalSpent = enriched.reduce((s, t) => s + t.total_spent, 0);

  res.json({
    tasks: enriched,
    summary: {
      total_tasks: tasks.length,
      overdue: overdueCount,
      pending: tasks.filter(t => t.status === 'pending').length,
      total_spent: Math.round(totalSpent * 100) / 100,
    },
  });
});

// POST /api/maintenance/tasks
router.post('/tasks', (req, res) => {
  const { name, category, priority, frequency, frequency_value, next_due, estimated_cost, assigned_to, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const result = db.prepare(`
    INSERT INTO maintenance_tasks (name, category, priority, frequency, frequency_value, next_due, estimated_cost, assigned_to, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, category || 'general', priority || 'medium', frequency, frequency_value, next_due, estimated_cost, assigned_to, notes);

  res.json({ id: result.lastInsertRowid });
});

// PUT /api/maintenance/tasks/:id
router.put('/tasks/:id', (req, res) => {
  const { name, category, priority, status, frequency, frequency_value, next_due, estimated_cost, assigned_to, notes } = req.body;

  db.prepare(`
    UPDATE maintenance_tasks
    SET name=?, category=?, priority=?, status=?, frequency=?, frequency_value=?, next_due=?, estimated_cost=?, assigned_to=?, notes=?
    WHERE id=?
  `).run(name, category, priority, status, frequency, frequency_value, next_due, estimated_cost, assigned_to, notes, req.params.id);

  res.json({ success: true });
});

// DELETE /api/maintenance/tasks/:id
router.delete('/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM maintenance_tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/maintenance/tasks/:id/complete — log completion and reschedule
router.post('/tasks/:id/complete', (req, res) => {
  const task = db.prepare('SELECT * FROM maintenance_tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Not found' });

  const { cost, vendor, notes } = req.body;
  const now = new Date().toISOString().split('T')[0];

  // Log the completion
  db.prepare(`
    INSERT INTO maintenance_logs (task_id, completed_date, cost, vendor, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(task.id, now, cost || 0, vendor, notes);

  // Calculate next due date if recurring
  let nextDue = null;
  if (task.frequency && task.frequency_value) {
    const next = new Date();
    switch (task.frequency) {
      case 'days': next.setDate(next.getDate() + task.frequency_value); break;
      case 'weeks': next.setDate(next.getDate() + task.frequency_value * 7); break;
      case 'months': next.setMonth(next.getMonth() + task.frequency_value); break;
      case 'years': next.setFullYear(next.getFullYear() + task.frequency_value); break;
    }
    nextDue = next.toISOString().split('T')[0];
  }

  db.prepare(`
    UPDATE maintenance_tasks SET last_completed = ?, next_due = ?, status = ? WHERE id = ?
  `).run(now, nextDue, nextDue ? 'pending' : 'completed', task.id);

  res.json({ success: true, next_due: nextDue });
});

// ─── Logs ────────────────────────────────────────────

// GET /api/maintenance/tasks/:id/logs
router.get('/tasks/:id/logs', (req, res) => {
  const logs = db.prepare(
    'SELECT * FROM maintenance_logs WHERE task_id = ? ORDER BY completed_date DESC'
  ).all(req.params.id);
  res.json(logs);
});

// DELETE /api/maintenance/logs/:id
router.delete('/logs/:id', (req, res) => {
  db.prepare('DELETE FROM maintenance_logs WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Assets ──────────────────────────────────────────

// GET /api/maintenance/assets
router.get('/assets', (req, res) => {
  const assets = db.prepare('SELECT * FROM assets ORDER BY name').all();

  const warrantyExpiring = assets.filter(a => {
    if (!a.warranty_expiry) return false;
    const days = Math.ceil((new Date(a.warranty_expiry) - new Date()) / (1000 * 60 * 60 * 24));
    return days <= 90 && days >= 0;
  });

  res.json({
    assets,
    summary: {
      total_assets: assets.length,
      total_value: Math.round(assets.reduce((s, a) => s + (parseFloat(a.purchase_price) || 0), 0) * 100) / 100,
      warranty_expiring_soon: warrantyExpiring.length,
    },
  });
});

// POST /api/maintenance/assets
router.post('/assets', (req, res) => {
  const { name, category, location, manufacturer, model, serial_number, purchase_date, purchase_price, warranty_expiry, condition, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const result = db.prepare(`
    INSERT INTO assets (name, category, location, manufacturer, model, serial_number, purchase_date, purchase_price, warranty_expiry, condition, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, category || 'appliance', location, manufacturer, model, serial_number, purchase_date, purchase_price, warranty_expiry, condition || 'good', notes);

  res.json({ id: result.lastInsertRowid });
});

// PUT /api/maintenance/assets/:id
router.put('/assets/:id', (req, res) => {
  const { name, category, location, manufacturer, model, serial_number, purchase_date, purchase_price, warranty_expiry, condition, notes } = req.body;

  db.prepare(`
    UPDATE assets
    SET name=?, category=?, location=?, manufacturer=?, model=?, serial_number=?, purchase_date=?, purchase_price=?, warranty_expiry=?, condition=?, notes=?
    WHERE id=?
  `).run(name, category, location, manufacturer, model, serial_number, purchase_date, purchase_price, warranty_expiry, condition, notes, req.params.id);

  res.json({ success: true });
});

// DELETE /api/maintenance/assets/:id
router.delete('/assets/:id', (req, res) => {
  db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Dashboard summary ──────────────────────────────

router.get('/dashboard/summary', (req, res) => {
  const overdue = db.prepare(`
    SELECT COUNT(*) as count FROM maintenance_tasks
    WHERE next_due < date('now') AND status != 'completed'
  `).get();

  const upcoming = db.prepare(`
    SELECT * FROM maintenance_tasks
    WHERE next_due BETWEEN date('now') AND date('now', '+30 days') AND status != 'completed'
    ORDER BY next_due ASC LIMIT 5
  `).all();

  const recentLogs = db.prepare(`
    SELECT ml.*, mt.name as task_name
    FROM maintenance_logs ml
    JOIN maintenance_tasks mt ON ml.task_id = mt.id
    ORDER BY ml.completed_date DESC LIMIT 5
  `).all();

  res.json({
    overdue_count: overdue.count,
    upcoming_tasks: upcoming,
    recent_completions: recentLogs,
  });
});

export default router;
