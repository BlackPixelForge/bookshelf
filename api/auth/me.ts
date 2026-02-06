import { VercelResponse } from '@vercel/node';
import { withAuth } from '../lib/auth';
import { AuthRequest } from '../lib/types';

export default withAuth(async (req: AuthRequest, res: VercelResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.json({ user: req.user });
});
