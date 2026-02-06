import { VercelResponse } from '@vercel/node';
import { sql, initDatabase } from '../lib/db';
import { withAuth } from '../lib/auth';
import { AuthRequest, Tag } from '../lib/types';

async function getTags(req: AuthRequest, res: VercelResponse) {
  const userId = req.user!.id;

  try {
    await initDatabase();
    const result = await sql`
      SELECT * FROM tags WHERE user_id = ${userId} ORDER BY name
    `;

    return res.json(result);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return res.status(500).json({ error: 'Failed to fetch tags' });
  }
}

async function createTag(req: AuthRequest, res: VercelResponse) {
  const userId = req.user!.id;
  const { name, color } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 50) {
    return res.status(400).json({ error: 'Tag name is required (max 50 chars)' });
  }
  if (color !== undefined && (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color))) {
    return res.status(400).json({ error: 'Color must be a valid hex color (e.g. #6366f1)' });
  }

  try {
    await initDatabase();
    // Check if tag exists
    const existing = await sql`
      SELECT id FROM tags WHERE user_id = ${userId} AND name = ${name}
    `;

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Tag already exists' });
    }

    const result = await sql`
      INSERT INTO tags (user_id, name, color)
      VALUES (${userId}, ${name}, ${color || '#6366f1'})
      RETURNING *
    `;

    return res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating tag:', error);
    return res.status(500).json({ error: 'Failed to create tag' });
  }
}

export default withAuth(async (req: AuthRequest, res: VercelResponse) => {
  if (req.method === 'GET') {
    return getTags(req, res);
  } else if (req.method === 'POST') {
    return createTag(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
});
