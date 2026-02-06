import { Router, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { runQuery, getOne, getAll } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest, Book, Tag } from '../types/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// List books with optional filters
router.get(
  '/',
  [
    query('status').optional().isIn(['unread', 'in_progress', 'completed']),
    query('tag').optional().isInt(),
    query('q').optional().isString(),
  ],
  (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user!.id;
    const { status, tag, q } = req.query;

    let sql = 'SELECT DISTINCT b.* FROM books b';
    const params: any[] = [];
    const conditions: string[] = ['b.user_id = ?'];
    params.push(userId);

    if (tag) {
      sql += ' JOIN book_tags bt ON b.id = bt.book_id';
      conditions.push('bt.tag_id = ?');
      params.push(Number(tag));
    }

    if (status) {
      conditions.push('b.status = ?');
      params.push(status);
    }

    if (q) {
      conditions.push('(b.title LIKE ? OR b.authors LIKE ?)');
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY b.added_at DESC';

    try {
      const books = getAll<Book>(sql, params);

      // Parse JSON fields and fetch tags for each book
      const booksWithTags = books.map((book) => {
        const tags = getAll<Tag>(
          `SELECT t.id, t.name, t.color
           FROM tags t
           JOIN book_tags bt ON t.id = bt.tag_id
           WHERE bt.book_id = ?`,
          [book.id]
        );

        return {
          ...book,
          authors: book.authors ? JSON.parse(book.authors as string) : [],
          genres: book.genres ? JSON.parse(book.genres as string) : [],
          tags,
        };
      });

      res.json(booksWithTags);
    } catch (error) {
      console.error('Error fetching books:', error);
      res.status(500).json({ error: 'Failed to fetch books' });
    }
  }
);

// Get single book
router.get(
  '/:id',
  [param('id').isInt()],
  (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user!.id;
    const bookId = Number(req.params.id);

    try {
      const book = getOne<Book>(
        'SELECT * FROM books WHERE id = ? AND user_id = ?',
        [bookId, userId]
      );

      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }

      const tags = getAll<Tag>(
        `SELECT t.id, t.name, t.color
         FROM tags t
         JOIN book_tags bt ON t.id = bt.tag_id
         WHERE bt.book_id = ?`,
        [bookId]
      );

      res.json({
        ...book,
        authors: book.authors ? JSON.parse(book.authors as string) : [],
        genres: book.genres ? JSON.parse(book.genres as string) : [],
        tags,
      });
    } catch (error) {
      console.error('Error fetching book:', error);
      res.status(500).json({ error: 'Failed to fetch book' });
    }
  }
);

// Add book
router.post(
  '/',
  [
    body('title').notEmpty().trim(),
    body('authors').optional().isArray(),
    body('open_library_key').optional().isString(),
    body('publication_year').optional().isInt(),
    body('isbn_13').optional().isString(),
    body('genres').optional().isArray(),
    body('cover_url').optional().isString(),
    body('status').optional().isIn(['unread', 'in_progress', 'completed']),
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('notes').optional().isString(),
    body('tags').optional().isArray(),
  ],
  (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user!.id;
    const {
      title,
      authors,
      open_library_key,
      publication_year,
      isbn_13,
      genres,
      cover_url,
      status,
      rating,
      notes,
      tags,
    } = req.body;

    try {
      const result = runQuery(
        `INSERT INTO books (
          user_id, title, authors, open_library_key, publication_year,
          isbn_13, genres, cover_url, status, rating, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          title,
          authors ? JSON.stringify(authors) : null,
          open_library_key || null,
          publication_year || null,
          isbn_13 || null,
          genres ? JSON.stringify(genres) : null,
          cover_url || null,
          status || 'unread',
          rating || null,
          notes || null,
        ]
      );

      const bookId = result.lastInsertRowid;

      // Add tags if provided — verify ownership
      if (tags && tags.length > 0) {
        const ownedTags = getAll<{ id: number }>(
          `SELECT id FROM tags WHERE id IN (${tags.map(() => '?').join(',')}) AND user_id = ?`,
          [...tags, userId]
        );
        const ownedTagIds = new Set(ownedTags.map(t => t.id));

        for (const tagId of tags) {
          if (ownedTagIds.has(tagId)) {
            runQuery(
              'INSERT OR IGNORE INTO book_tags (book_id, tag_id) VALUES (?, ?)',
              [bookId, tagId]
            );
          }
        }
      }

      const book = getOne<Book>('SELECT * FROM books WHERE id = ?', [bookId]);
      const bookTags = getAll<Tag>(
        `SELECT t.id, t.name, t.color
         FROM tags t
         JOIN book_tags bt ON t.id = bt.tag_id
         WHERE bt.book_id = ?`,
        [bookId]
      );

      res.status(201).json({
        ...book,
        authors: book!.authors ? JSON.parse(book!.authors as string) : [],
        genres: book!.genres ? JSON.parse(book!.genres as string) : [],
        tags: bookTags,
      });
    } catch (error) {
      console.error('Error adding book:', error);
      res.status(500).json({ error: 'Failed to add book' });
    }
  }
);

// Update book
router.put(
  '/:id',
  [
    param('id').isInt(),
    body('title').optional().notEmpty().trim(),
    body('authors').optional().isArray(),
    body('status').optional().isIn(['unread', 'in_progress', 'completed']),
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('notes').optional().isString(),
    body('tags').optional().isArray(),
  ],
  (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user!.id;
    const bookId = Number(req.params.id);

    try {
      // Check ownership
      const existing = getOne<{ id: number }>(
        'SELECT id FROM books WHERE id = ? AND user_id = ?',
        [bookId, userId]
      );

      if (!existing) {
        return res.status(404).json({ error: 'Book not found' });
      }

      const updates: string[] = [];
      const params: any[] = [];

      const fields = ['title', 'status', 'rating', 'notes'];
      for (const field of fields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          params.push(req.body[field]);
        }
      }

      if (req.body.authors !== undefined) {
        updates.push('authors = ?');
        params.push(JSON.stringify(req.body.authors));
      }

      if (updates.length > 0) {
        params.push(bookId);
        runQuery(`UPDATE books SET ${updates.join(', ')} WHERE id = ?`, params);
      }

      // Update tags if provided — verify ownership
      if (req.body.tags !== undefined) {
        runQuery('DELETE FROM book_tags WHERE book_id = ?', [bookId]);
        const tagIds = req.body.tags as number[];
        if (tagIds.length > 0) {
          const ownedTags = getAll<{ id: number }>(
            `SELECT id FROM tags WHERE id IN (${tagIds.map(() => '?').join(',')}) AND user_id = ?`,
            [...tagIds, userId]
          );
          const ownedTagIds = new Set(ownedTags.map(t => t.id));

          for (const tagId of tagIds) {
            if (ownedTagIds.has(tagId)) {
              runQuery(
                'INSERT OR IGNORE INTO book_tags (book_id, tag_id) VALUES (?, ?)',
                [bookId, tagId]
              );
            }
          }
        }
      }

      const book = getOne<Book>('SELECT * FROM books WHERE id = ?', [bookId]);
      const tags = getAll<Tag>(
        `SELECT t.id, t.name, t.color
         FROM tags t
         JOIN book_tags bt ON t.id = bt.tag_id
         WHERE bt.book_id = ?`,
        [bookId]
      );

      res.json({
        ...book,
        authors: book!.authors ? JSON.parse(book!.authors as string) : [],
        genres: book!.genres ? JSON.parse(book!.genres as string) : [],
        tags,
      });
    } catch (error) {
      console.error('Error updating book:', error);
      res.status(500).json({ error: 'Failed to update book' });
    }
  }
);

// Delete book
router.delete(
  '/:id',
  [param('id').isInt()],
  (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user!.id;
    const bookId = Number(req.params.id);

    try {
      const result = runQuery(
        'DELETE FROM books WHERE id = ? AND user_id = ?',
        [bookId, userId]
      );

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Book not found' });
      }

      res.json({ message: 'Book deleted' });
    } catch (error) {
      console.error('Error deleting book:', error);
      res.status(500).json({ error: 'Failed to delete book' });
    }
  }
);

export default router;
