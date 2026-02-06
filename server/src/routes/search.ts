import { Router, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/auth.js';
import { searchBooks, searchByISBN } from '../services/openLibrary.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Search books by query
router.get(
  '/',
  [query('q').notEmpty().isString()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msgs = errors.array().map((e) => e.msg);
      return res.status(400).json({ error: msgs.join(', '), errors: errors.array() });
    }

    const searchQuery = req.query.q as string;

    try {
      const results = await searchBooks(searchQuery);
      res.json(results);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  }
);

// Search by ISBN
router.get(
  '/isbn/:isbn',
  [param('isbn').notEmpty().isString()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msgs = errors.array().map((e) => e.msg);
      return res.status(400).json({ error: msgs.join(', '), errors: errors.array() });
    }

    const { isbn } = req.params;

    try {
      const result = await searchByISBN(isbn);
      if (!result) {
        return res.status(404).json({ error: 'Book not found' });
      }
      res.json(result);
    } catch (error) {
      console.error('ISBN search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  }
);

export default router;
