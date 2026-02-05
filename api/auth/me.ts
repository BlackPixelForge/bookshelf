import { VercelResponse } from '@vercel/node';
import { withAuth } from '../lib/auth';
import { AuthRequest } from '../lib/types';

export default withAuth(async (req: AuthRequest, res: VercelResponse) => {
  return res.json({ user: req.user });
});
