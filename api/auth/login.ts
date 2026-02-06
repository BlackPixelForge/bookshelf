import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';
import { verifyPassword, generateToken, setCookie } from '../lib/auth';
import { checkRateLimit } from '../lib/rateLimit';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (checkRateLimit(req, res)) return;

  const { email, password } = req.body;

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const result = await sql`SELECT id, email, password_hash FROM users WHERE email = ${normalizedEmail}`;

    if (result.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result[0];

    const valid = await verifyPassword(password, user.password_hash as string);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id as number, user.email as string);
    setCookie(res, 'auth_token', token);

    return res.json({
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', (error as Error).message);
    return res.status(500).json({ error: 'Login failed' });
  }
}
