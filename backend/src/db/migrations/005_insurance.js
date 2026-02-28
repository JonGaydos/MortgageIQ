export function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS insurance_policies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'home',
      provider TEXT,
      policy_number TEXT,
      coverage_amount REAL,
      deductible REAL,
      premium REAL NOT NULL DEFAULT 0,
      premium_cycle TEXT DEFAULT 'monthly',
      start_date TEXT,
      renewal_date TEXT,
      auto_renew INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS insurance_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      policy_id INTEGER NOT NULL,
      payment_date TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      period_start TEXT,
      period_end TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (policy_id) REFERENCES insurance_policies(id) ON DELETE CASCADE
    )
  `);
}
