import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { runQuery, getOne, getAll } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { AuthRequest, Tag } from '../types/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// List tags
router.get('/', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  try {
    const tags = getAll<Tag>(
      'SELECT * FROM tags WHERE user_id = ? ORDER BY name',
      [userId]
    );

    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Create tag
router.post(
  '/',
  [
    body('name').notEmpty().trim().isLength({ max: 50 }),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  ],
  (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user!.id;
    const { name, color } = req.body;

    try {
      // Check if tag already exists
      const existing = getOne<{ id: number }>(
        'SELECT id FROM tags WHERE user_id = ? AND name = ?',
        [userId, name]
      );

      if (existing) {
        return res.status(400).json({ error: 'Tag already exists' });
      }

      const result = runQuery(
        'INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)',
        [userId, name, color || '#6366f1']
      );

      const tag = getOne<Tag>('SELECT * FROM tags WHERE id = ?', [result.lastInsertRowid]);

      res.status(201).json(tag);
    } catch (error: any) {
      console.error('Error creating tag:', error);
      res.status(500).json({ error: 'Failed to create tag' });
    }
  }
);

// Update tag
router.put(
  '/:id',
  [
    param('id').isInt(),
    body('name').optional().notEmpty().trim().isLength({ max: 50 }),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  ],
  (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user!.id;
    const tagId = Number(req.params.id);
    const { name, color } = req.body;

    try {
      // Check ownership
      const existing = getOne<{ id: number }>(
        'SELECT id FROM tags WHERE id = ? AND user_id = ?',
        [tagId, userId]
      );

      if (!existing) {
        return res.status(404).json({ error: 'Tag not found' });
      }

      // Check for name conflict if updating name
      if (name !== undefined) {
        const conflict = getOne<{ id: number }>(
          'SELECT id FROM tags WHERE user_id = ? AND name = ? AND id != ?',
          [userId, name, tagId]
        );

        if (conflict) {
          return res.status(400).json({ error: 'Tag name already exists' });
        }
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
      }

      if (color !== undefined) {
        updates.push('color = ?');
        params.push(color);
      }

      if (updates.length > 0) {
        params.push(tagId);
        runQuery(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`, params);
      }

      const tag = getOne<Tag>('SELECT * FROM tags WHERE id = ?', [tagId]);

      res.json(tag);
    } catch (error: any) {
      console.error('Error updating tag:', error);
      res.status(500).json({ error: 'Failed to update tag' });
    }
  }
);

// Delete tag
router.delete(
  '/:id',
  [param('id').isInt()],
  (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user!.id;
    const tagId = Number(req.params.id);

    try {
      const result = runQuery(
        'DELETE FROM tags WHERE id = ? AND user_id = ?',
        [tagId, userId]
      );

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Tag not found' });
      }

      res.json({ message: 'Tag deleted' });
    } catch (error) {
      console.error('Error deleting tag:', error);
      res.status(500).json({ error: 'Failed to delete tag' });
    }
  }
);

export default router;
