import { VercelResponse } from '@vercel/node';
import { sql, initDatabase } from '../lib/db';
import { withAuth } from '../lib/auth';
import { AuthRequest } from '../lib/types';

async function updateTag(req: AuthRequest, res: VercelResponse) {
  const userId = req.user!.id;
  const tagId = Number(req.query.id);
  const { name, color } = req.body;

  if (!tagId) {
    return res.status(400).json({ error: 'Tag ID required' });
  }

  // Validate inputs
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.length > 50)) {
    return res.status(400).json({ error: 'Tag name must be a non-empty string (max 50 chars)' });
  }
  if (color !== undefined && (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color))) {
    return res.status(400).json({ error: 'Color must be a valid hex color (e.g. #6366f1)' });
  }

  try {
    await initDatabase();
    // Check ownership
    const existing = await sql`
      SELECT id FROM tags WHERE id = ${tagId} AND user_id = ${userId}
    `;

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Check for name conflict
    if (name) {
      const conflict = await sql`
        SELECT id FROM tags
        WHERE user_id = ${userId} AND name = ${name} AND id != ${tagId}
      `;

      if (conflict.length > 0) {
        return res.status(400).json({ error: 'Tag name already exists' });
      }
    }

    // Update tag fields individually
    if (name !== undefined) {
      await sql`UPDATE tags SET name = ${name} WHERE id = ${tagId}`;
    }
    if (color !== undefined) {
      await sql`UPDATE tags SET color = ${color} WHERE id = ${tagId}`;
    }

    const result = await sql`SELECT * FROM tags WHERE id = ${tagId}`;
    return res.json(result[0]);
  } catch (error) {
    console.error('Error updating tag:', error);
    return res.status(500).json({ error: 'Failed to update tag' });
  }
}

async function deleteTag(req: AuthRequest, res: VercelResponse) {
  const userId = req.user!.id;
  const tagId = Number(req.query.id);

  if (!tagId) {
    return res.status(400).json({ error: 'Tag ID required' });
  }

  try {
    await initDatabase();
    const result = await sql`
      DELETE FROM tags WHERE id = ${tagId} AND user_id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    return res.json({ message: 'Tag deleted' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return res.status(500).json({ error: 'Failed to delete tag' });
  }
}

export default withAuth(async (req: AuthRequest, res: VercelResponse) => {
  if (req.method === 'PUT') {
    return updateTag(req, res);
  } else if (req.method === 'DELETE') {
    return deleteTag(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
});
