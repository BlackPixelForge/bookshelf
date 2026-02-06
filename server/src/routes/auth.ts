import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { runQuery, getOne } from '../config/db.js';
import { hashPassword, verifyPassword, generateToken, cookieOptions } from '../services/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { User, AuthRequest } from '../types/index.js';

const router = Router();

// Register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msgs = errors.array().map((e) => e.msg);
      return res.status(400).json({ error: msgs.join(', '), errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check if user exists
      const existing = getOne<{ id: number }>('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const passwordHash = await hashPassword(password);

      const result = runQuery(
        'INSERT INTO users (email, password_hash) VALUES (?, ?)',
        [email, passwordHash]
      );

      const token = generateToken(result.lastInsertRowid, email);
      res.cookie('auth_token', token, cookieOptions);

      res.status(201).json({
        user: { id: result.lastInsertRowid, email },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msgs = errors.array().map((e) => e.msg);
      return res.status(400).json({ error: msgs.join(', '), errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const user = getOne<User>('SELECT * FROM users WHERE email = ?', [email]);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken(user.id, user.email);
      res.cookie('auth_token', token, cookieOptions);

      res.json({
        user: { id: user.id, email: user.email },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', { path: '/' });
  res.json({ message: 'Logged out' });
});

// Get current user
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

export default router;
