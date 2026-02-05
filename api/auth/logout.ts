import { VercelRequest, VercelResponse } from '@vercel/node';
import { clearCookie } from '../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  clearCookie(res, 'auth_token');
  return res.json({ message: 'Logged out' });
}
