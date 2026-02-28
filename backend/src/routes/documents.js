import { Router } from 'express';
import db from '../db/index.js';
import { auth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { extractDocument } from '../services/ai.js';
import fs from 'fs';
import path from 'path';

const router = Router();
router.use(auth);

const DATA_DIR = process.env.DATA_DIR || './data';

// GET /api/documents — list all documents
router.get('/', (req, res) => {
  const { category, linked_type, linked_id, limit } = req.query;
  let sql = 'SELECT * FROM documents';
  const params = [];
  const conditions = [];

  if (category) { conditions.push('category = ?'); params.push(category); }
  if (linked_type) { conditions.push('linked_type = ?'); params.push(linked_type); }
  if (linked_id) { conditions.push('linked_id = ?'); params.push(linked_id); }

  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY uploaded_at DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }

  const docs = db.prepare(sql).all(...params);
  res.json(docs.map(d => ({
    ...d,
    ai_extracted: safeJson(d.ai_extracted),
    tags: safeJson(d.tags),
  })));
});

// GET /api/documents/:id
router.get('/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json({
    ...doc,
    ai_extracted: safeJson(doc.ai_extracted),
    tags: safeJson(doc.tags),
  });
});

// POST /api/documents/upload — upload a document
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { category, subcategory, linked_type, linked_id, notes, tags } = req.body;

  // Organize file into category/year structure
  const year = new Date().getFullYear().toString();
  const destDir = path.join(DATA_DIR, 'uploads', category || 'general', subcategory || '', year);
  fs.mkdirSync(destDir, { recursive: true });

  const destPath = path.join(destDir, req.file.filename);
  fs.renameSync(req.file.path, destPath);

  const relativePath = path.relative(DATA_DIR, destPath).replace(/\\/g, '/');

  const result = db.prepare(`
    INSERT INTO documents (filename, original_name, mime_type, file_size, file_path, category, subcategory, linked_type, linked_id, tags, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.file.filename,
    req.file.originalname,
    req.file.mimetype,
    req.file.size,
    relativePath,
    category || 'general',
    subcategory || null,
    linked_type || null,
    linked_id ? parseInt(linked_id) : null,
    tags || '[]',
    notes || null,
  );

  res.json({ id: result.lastInsertRowid, path: relativePath });
});

// POST /api/documents/:id/extract — run AI extraction
router.post('/:id/extract', async (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  const fullPath = path.join(DATA_DIR, doc.file_path);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found on disk' });

  const extraction = await extractDocument(fullPath);

  if (extraction.data) {
    db.prepare(`
      UPDATE documents SET ai_extracted = ?, ai_confidence = ?, ai_provider = ? WHERE id = ?
    `).run(JSON.stringify(extraction.data), extraction.confidence, extraction.provider, req.params.id);
  }

  res.json(extraction);
});

// PUT /api/documents/:id — update metadata
router.put('/:id', (req, res) => {
  const { category, subcategory, linked_type, linked_id, tags, notes, ai_extracted } = req.body;

  db.prepare(`
    UPDATE documents
    SET category=?, subcategory=?, linked_type=?, linked_id=?, tags=?, notes=?, ai_extracted=?
    WHERE id=?
  `).run(
    category, subcategory, linked_type, linked_id,
    typeof tags === 'string' ? tags : JSON.stringify(tags || []),
    notes,
    typeof ai_extracted === 'string' ? ai_extracted : JSON.stringify(ai_extracted || {}),
    req.params.id,
  );

  res.json({ success: true });
});

// DELETE /api/documents/:id
router.delete('/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (doc) {
    const fullPath = path.join(DATA_DIR, doc.file_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

function safeJson(str) {
  try { return JSON.parse(str || '{}'); } catch { return {}; }
}

export default router;
