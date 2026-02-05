import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDatabase } from './config/db.js';
import authRoutes from './routes/auth.js';
import booksRoutes from './routes/books.js';
import searchRoutes from './routes/search.js';
import tagsRoutes from './routes/tags.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  // Initialize database
  await initDatabase();

  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
  }));
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  }));

  // Rate limiting for auth routes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: { error: 'Too many attempts, please try again later' },
  });

  // Body parsing
  app.use(express.json());
  app.use(cookieParser());

  // Routes
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/books', booksRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/tags', tagsRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Serve static files in production
  if (isProduction) {
    const publicPath = path.join(__dirname, '../public');
    app.use(express.static(publicPath));

    // SPA fallback - serve index.html for non-API routes
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(publicPath, 'index.html'));
    });
  }

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
