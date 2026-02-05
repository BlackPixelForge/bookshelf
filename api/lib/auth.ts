import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthRequest } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'bookshelf-secret-change-in-production';
const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: number, email: string): string {
  return jwt.sign(
    { id: userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): { id: number; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: number; email: string };
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

// Middleware to verify JWT token
export function withAuth(
  handler: (req: AuthRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Parse cookies manually
    const cookies: Record<string, string> = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const [key, value] = cookie.trim().split('=');
        cookies[key] = value;
      });
    }

    const token = cookies.auth_token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    (req as AuthRequest).user = decoded;
    return handler(req as AuthRequest, res);
  };
}

// Helper to set cookie in response
export function setCookie(res: VercelResponse, name: string, value: string) {
  const options = cookieOptions;
  const cookieString = `${name}=${value}; Path=${options.path}; Max-Age=${options.maxAge}; HttpOnly; ${options.secure ? 'Secure;' : ''} SameSite=${options.sameSite}`;
  res.setHeader('Set-Cookie', cookieString);
}

// Helper to clear cookie
export function clearCookie(res: VercelResponse, name: string) {
  res.setHeader('Set-Cookie', `${name}=; Path=/; Max-Age=0`);
}
