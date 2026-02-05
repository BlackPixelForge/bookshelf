import { VercelResponse } from '@vercel/node';
import { withAuth } from '../../lib/auth';
import { searchByISBN } from '../../lib/openLibrary';
import { AuthRequest } from '../../lib/types';

export default withAuth(async (req: AuthRequest, res: VercelResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { isbn } = req.query;

  if (!isbn || typeof isbn !== 'string') {
    return res.status(400).json({ error: 'ISBN required' });
  }

  try {
    const result = await searchByISBN(isbn);
    if (!result) {
      return res.status(404).json({ error: 'Book not found' });
    }
    return res.json(result);
  } catch (error) {
    console.error('ISBN search error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
});
