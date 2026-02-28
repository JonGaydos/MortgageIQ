export function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      frequency TEXT,
      frequency_value INTEGER,
      last_completed TEXT,
      next_due TEXT,
      estimated_cost REAL,
      assigned_to TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      completed_date TEXT NOT NULL,
      cost REAL DEFAULT 0,
      vendor TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES maintenance_tasks(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'appliance',
      location TEXT,
      manufacturer TEXT,
      model TEXT,
      serial_number TEXT,
      purchase_date TEXT,
      purchase_price REAL,
      warranty_expiry TEXT,
      condition TEXT DEFAULT 'good',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
}
