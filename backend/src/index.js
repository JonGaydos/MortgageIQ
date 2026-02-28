import express from 'express';
import cors from 'cors';
import path from 'path';
import { runMigrations } from './db/migrate.js';
import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = process.env.DATA_DIR || './data';

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/statements', express.static(path.join(DATA_DIR, 'statements')));
app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '5.0.0' });
});

// Start server
async function start() {
  try {
    await runMigrations();
    console.log('Database migrations complete');

    app.listen(PORT, () => {
      console.log(`PayoffIQ backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
