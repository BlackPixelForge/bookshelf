import { VercelResponse } from '@vercel/node';
import { withAuth } from '../lib/auth';
import { searchBooks } from '../lib/openLibrary';
import { AuthRequest } from '../lib/types';

export default withAuth(async (req: AuthRequest, res: VercelResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Search query required' });
  }

  try {
    const results = await searchBooks(q);
    return res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
});
