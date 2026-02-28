import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import db from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

export async function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      filename TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    db.prepare('SELECT version FROM schema_version').all().map(r => r.version)
  );

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  for (const file of files) {
    const version = parseInt(file.split('_')[0], 10);
    if (applied.has(version)) continue;

    console.log(`Running migration: ${file}`);
    const filePath = pathToFileURL(path.join(migrationsDir, file)).href;
    const migration = await import(filePath);

    db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO schema_version (version, filename) VALUES (?, ?)').run(version, file);
    })();

    console.log(`Migration ${file} applied successfully`);
  }
}
