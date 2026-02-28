export function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      event_date TEXT NOT NULL,
      event_type TEXT DEFAULT 'custom',
      linked_type TEXT,
      linked_id INTEGER,
      color TEXT,
      all_day INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
}
