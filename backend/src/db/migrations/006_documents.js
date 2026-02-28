export function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER,
      file_path TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      subcategory TEXT,
      linked_type TEXT,
      linked_id INTEGER,
      ai_extracted TEXT DEFAULT '{}',
      ai_confidence REAL,
      ai_provider TEXT,
      paperless_id INTEGER,
      tags TEXT DEFAULT '[]',
      notes TEXT,
      uploaded_at TEXT DEFAULT (datetime('now'))
    )
  `);
}
