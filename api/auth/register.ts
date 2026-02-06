import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, initDatabase } from '../lib/db';
import { hashPassword, generateToken, setCookie } from '../lib/auth';
import { checkRateLimit } from '../lib/rateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (checkRateLimit(req, res)) return;

  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  if (password.length > 72) {
    return res.status(400).json({ error: 'Password must be at most 72 characters' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    await initDatabase();
    const passwordHash = await hashPassword(password);

    // Use INSERT ... ON CONFLICT to avoid race condition
    const result = await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${normalizedEmail}, ${passwordHash})
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email
    `;

    if (result.length === 0) {
      // Generic message to reduce user enumeration
      return res.status(400).json({ error: 'Unable to create account. Email may already be registered.' });
    }

    const user = result[0];
    const token = generateToken(user.id as number, user.email as string);

    setCookie(res, 'auth_token', token);

    return res.status(201).json({
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error('Registration error:', (error as Error).message);
    return res.status(500).json({ error: 'Registration failed' });
  }
}
