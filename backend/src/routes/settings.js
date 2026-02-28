import { Router } from 'express';
import db, { getSetting, setSetting, deleteSetting } from '../db/index.js';
import { auth } from '../middleware/auth.js';

const router = Router();
router.use(auth);

const ALLOWED_KEYS = [
  'claude_api_key',
  'openai_api_key',
  'gemini_api_key',
  'copilot_api_key',
  'ollama_url',
  'ai_provider',
  'paperless_ngx_url',
  'paperless_ngx_token',
  'theme',
  'currency',
  'locale',
  'auto_lock_minutes',
  'homebox_url',
  'homebox_token'
];

const API_KEY_FIELDS = [
  'claude_api_key',
  'openai_api_key',
  'gemini_api_key',
  'copilot_api_key',
  'paperless_ngx_token',
  'homebox_token'
];

function maskValue(key, value) {
  if (!value || !API_KEY_FIELDS.includes(key)) return value;
  if (value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••••••' + value.slice(-4);
}

// Get all settings
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = maskValue(row.key, row.value);
  }
  // Include hasKey flags for API keys
  for (const key of API_KEY_FIELDS) {
    settings[`has_${key}`] = !!getSetting(key);
  }
  res.json(settings);
});

// Save settings
router.post('/', (req, res) => {
  const entries = req.body;
  if (typeof entries !== 'object') return res.status(400).json({ error: 'Invalid body' });

  for (const [key, value] of Object.entries(entries)) {
    if (!ALLOWED_KEYS.includes(key)) continue;
    // Skip masked values (user didn't change them)
    if (typeof value === 'string' && value.includes('••••••••')) continue;
    setSetting(key, value);
  }
  res.json({ success: true });
});

// Delete a setting
router.delete('/:key', (req, res) => {
  const { key } = req.params;
  if (!ALLOWED_KEYS.includes(key)) return res.status(400).json({ error: 'Invalid setting key' });
  deleteSetting(key);
  res.json({ success: true });
});

export default router;
