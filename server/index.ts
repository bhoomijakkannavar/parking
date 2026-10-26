import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './db/init';
import { closeDb } from './db/database';
import { apiRouter } from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Initialize SQLite database and seed initial 15 slots if first launch
try {
  initializeDatabase();
  console.log('[SCPM Server] SQLite Database initialized successfully.');
} catch (err) {
  console.error('[SCPM Server] Database initialization failed:', err);
  process.exit(1);
}

// Mount API routes
app.use('/api', apiRouter);

// Centralized error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[SCPM Server Error]', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred.',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

// Start listening
const server = app.listen(PORT, () => {
  console.log(`[SCPM Server] API Server running on http://localhost:${PORT}`);
  console.log(`[SCPM Server] Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('[SCPM Server] Shutting down server and closing database...');
  server.close(() => {
    closeDb();
    console.log('[SCPM Server] Database closed cleanly.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
