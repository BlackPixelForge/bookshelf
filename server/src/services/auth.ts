import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Lazy JWT_SECRET — avoids crashing the module at load time
// when JWT_SECRET is not yet configured
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  return 'bookshelf-secret-change-in-production';
}

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
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): { id: number; email: string } | null {
  try {
    return jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as { id: number; email: string };
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
