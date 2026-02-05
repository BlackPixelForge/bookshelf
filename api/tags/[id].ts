import { VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';
import { withAuth } from '../lib/auth';
import { AuthRequest } from '../lib/types';

async function updateTag(req: AuthRequest, res: VercelResponse) {
  const userId = req.user!.id;
  const tagId = Number(req.query.id);
  const { name, color } = req.body;

  if (!tagId) {
    return res.status(400).json({ error: 'Tag ID required' });
  }

  try {
    // Check ownership
    const existing = await sql`
      SELECT id FROM tags WHERE id = ${tagId} AND user_id = ${userId}
    `;

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Check for name conflict
    if (name) {
      const conflict = await sql`
        SELECT id FROM tags
        WHERE user_id = ${userId} AND name = ${name} AND id != ${tagId}
      `;

      if (conflict.rows.length > 0) {
        return res.status(400).json({ error: 'Tag name already exists' });
      }
    }

    // Build update
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push(`name = $${updates.length + 1}`);
      values.push(name);
    }
    if (color !== undefined) {
      updates.push(`color = $${updates.length + 1}`);
      values.push(color);
    }

    if (updates.length > 0) {
      await sql.query(
        `UPDATE tags SET ${updates.join(', ')} WHERE id = $${updates.length + 1}`,
        [...values, tagId]
      );
    }

    const result = await sql`SELECT * FROM tags WHERE id = ${tagId}`;
    return res.json(result.rows[0]);
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
    const result = await sql`
      DELETE FROM tags WHERE id = ${tagId} AND user_id = ${userId}
      RETURNING id
    `;

    if (result.rows.length === 0) {
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
