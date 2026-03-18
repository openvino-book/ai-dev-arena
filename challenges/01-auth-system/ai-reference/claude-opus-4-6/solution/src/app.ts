import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from './database';

const app = express();
app.use(express.json());

const JWT_SECRET = 'test-secret-key-for-challenge-1';
const JWT_EXPIRY = '24h';

// Types
interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  emailVerified: boolean;
  resetToken: string | null;
  resetTokenExpiresAt: string | null;
  verificationToken: string | null;
  createdAt: string;
  updatedAt: string;
}

interface JwtPayload {
  userId: string;
  role: string;
}

// Helper functions
function validatePassword(password: string): boolean {
  // At least 8 chars, contains uppercase, lowercase, and number
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return regex.test(password);
}

function sanitizeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: !!user.emailVerified,
    createdAt: user.createdAt
  };
}

// Auth middleware
function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).userId = decoded.userId;
    (req as any).userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
}

// RBAC middleware
function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req as any).userRole;
    if (!roles.includes(userRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

// Routes

// POST /api/auth/register
app.post('/api/auth/register', (req: Request, res: Response): void => {
  const { email, password, name, role } = req.body;

  // Validate password
  if (!validatePassword(password)) {
    res.status(422).json({ error: 'Password does not meet requirements' });
    return;
  }

  // Check if email already exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingUser) {
    res.status(409).json({ error: 'Email already exists' });
    return;
  }

  // Hash password
  const hashedPassword = bcrypt.hashSync(password, 10);

  // Create user
  const now = new Date().toISOString();
  const userId = uuidv4();
  const verificationToken = uuidv4();
  const userRole = role || 'viewer';

  db.prepare(`
    INSERT INTO users (id, email, password, name, role, emailVerified, resetToken, resetTokenExpiresAt, verificationToken, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, email, hashedPassword, name, userRole, 0, null, null, verificationToken, now, now);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User;
  res.status(201).json(sanitizeUser(user));
});

// POST /api/auth/login
app.post('/api/auth/login', (req: Request, res: Response): void => {
  const { email, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const isValidPassword = bcrypt.compareSync(password, user.password);
  if (!isValidPassword) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req: Request, res: Response): void => {
  const userId = (req as any).userId;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;

  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  res.json(sanitizeUser(user));
});

// PUT /api/auth/profile
app.put('/api/auth/profile', authMiddleware, (req: Request, res: Response): void => {
  const userId = (req as any).userId;
  const { name, email } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }

  if (email !== undefined && email !== user.email) {
    // Check if new email already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
    if (existingUser) {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }
    updates.push('email = ?');
    values.push(email);
    updates.push('emailVerified = ?');
    values.push(0);
    updates.push('verificationToken = ?');
    values.push(uuidv4());
  }

  if (updates.length > 0) {
    updates.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(userId);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User;
  res.json(sanitizeUser(updatedUser));
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', authMiddleware, (req: Request, res: Response): void => {
  const userId = (req as any).userId;
  const { currentPassword, newPassword } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  const isValidPassword = bcrypt.compareSync(currentPassword, user.password);
  if (!isValidPassword) {
    res.status(401).json({ error: 'Invalid current password' });
    return;
  }

  if (!validatePassword(newPassword)) {
    res.status(422).json({ error: 'Password does not meet requirements' });
    return;
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  const now = new Date().toISOString();

  db.prepare('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?').run(hashedPassword, now, userId);

  res.json({ message: 'Password updated' });
});

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', (req: Request, res: Response): void => {
  const { email } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;

  if (user) {
    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    db.prepare('UPDATE users SET resetToken = ?, resetTokenExpiresAt = ? WHERE id = ?').run(resetToken, expiresAt, user.id);
  }

  // Always return 200, even if email doesn't exist (for security)
  res.json({ message: 'Reset email sent' });
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', (req: Request, res: Response): void => {
  const { token, newPassword } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE resetToken = ?').get(token) as User | undefined;

  if (!user) {
    res.status(404).json({ error: 'Invalid token' });
    return;
  }

  const now = new Date();
  const expiresAt = new Date(user.resetTokenExpiresAt!);

  if (now > expiresAt) {
    res.status(422).json({ error: 'Token expired' });
    return;
  }

  if (!validatePassword(newPassword)) {
    res.status(422).json({ error: 'Password does not meet requirements' });
    return;
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  const updatedAt = new Date().toISOString();

  db.prepare('UPDATE users SET password = ?, resetToken = NULL, resetTokenExpiresAt = NULL, updatedAt = ? WHERE id = ?').run(hashedPassword, updatedAt, user.id);

  res.json({ message: 'Password reset successful' });
});

// POST /api/auth/verify-email
app.post('/api/auth/verify-email', (req: Request, res: Response): void => {
  const { token } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE verificationToken = ?').get(token) as User | undefined;

  if (!user) {
    res.status(404).json({ error: 'Invalid token' });
    return;
  }

  db.prepare('UPDATE users SET emailVerified = 1, verificationToken = NULL WHERE id = ?').run(user.id);

  res.json({ message: 'Email verified' });
});

// Admin routes

// GET /api/admin/users
app.get('/api/admin/users', authMiddleware, requireRole(['admin']), (req: Request, res: Response): void => {
  const users = db.prepare('SELECT id, email, name, role, emailVerified, createdAt, updatedAt FROM users').all() as User[];
  res.json({ users: users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    emailVerified: !!u.emailVerified,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  })) });
});

// DELETE /api/admin/users/:id
app.delete('/api/admin/users/:id', authMiddleware, requireRole(['admin']), (req: Request, res: Response): void => {
  const { id } = req.params;

  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ message: 'User deleted' });
});

// Editor routes

// GET /api/editor/content
app.get('/api/editor/content', authMiddleware, requireRole(['admin', 'editor']), (req: Request, res: Response): void => {
  res.json({ content: 'Editor content' });
});

// Test reset endpoint
app.post('/api/auth/test-reset', (req: Request, res: Response): void => {
  db.exec('DELETE FROM users');
  res.json({ message: 'Database reset' });
});

module.exports = { app };
