import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '@agenticmedia/database';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';

export const usersRouter = Router();
usersRouter.use(authenticate);

const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const inviteUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(255),
  role: z.enum(['admin', 'talent_manager', 'data_analyst', 'client_readonly']),
});

const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'talent_manager', 'data_analyst', 'client_readonly']),
});

// List team members
usersRouter.get('/team', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT id, email, full_name, role, is_active, last_login_at, created_at
       FROM users WHERE organization_id = $1 ORDER BY created_at`,
      [req.user!.organizationId]
    );
    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
});

// Update own profile
usersRouter.patch(
  '/profile',
  validate(updateProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (req.body.fullName) { updates.push(`full_name = $${paramIndex++}`); params.push(req.body.fullName); }
      if (req.body.email) {
        const existing = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [req.body.email, req.user!.userId]);
        if (existing.rows.length > 0) throw new AppError(409, 'Email already in use');
        updates.push(`email = $${paramIndex++}`);
        params.push(req.body.email);
      }

      if (updates.length === 0) throw new AppError(400, 'No fields to update');

      params.push(req.user!.userId);
      await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params);

      const result = await query(
        'SELECT id, email, full_name, role, is_active, last_login_at FROM users WHERE id = $1',
        [req.user!.userId]
      );
      res.json({ user: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// Change password
usersRouter.post(
  '/change-password',
  validate(changePasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user!.userId]);
      if (result.rows.length === 0) throw new AppError(404, 'User not found');

      const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
      if (!valid) throw new AppError(401, 'Current password is incorrect');

      const newHash = await bcrypt.hash(newPassword, 12);
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user!.userId]);

      res.json({ message: 'Password updated successfully' });
    } catch (err) {
      next(err);
    }
  }
);

// Invite team member
usersRouter.post(
  '/invite',
  authorize('admin'),
  validate(inviteUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, fullName, role } = req.body;

      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) throw new AppError(409, 'Email already registered');

      const id = uuidv4();
      const tempPassword = crypto.randomBytes(16).toString('base64url');
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      await query(
        `INSERT INTO users (id, organization_id, email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, req.user!.organizationId, email, passwordHash, fullName, role]
      );

      const result = await query(
        'SELECT id, email, full_name, role, is_active, created_at FROM users WHERE id = $1',
        [id]
      );

      res.status(201).json({ user: result.rows[0], tempPassword });
    } catch (err) {
      next(err);
    }
  }
);

// Update team member role
usersRouter.patch(
  '/:id/role',
  authorize('admin'),
  validate(updateUserRoleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.params.id === req.user!.userId) {
        throw new AppError(400, 'Cannot change your own role');
      }

      const result = await query(
        `UPDATE users SET role = $1 WHERE id = $2 AND organization_id = $3 RETURNING id, email, full_name, role`,
        [req.body.role, req.params.id, req.user!.organizationId]
      );
      if (result.rows.length === 0) throw new AppError(404, 'User not found');
      res.json({ user: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// Deactivate team member
usersRouter.post(
  '/:id/deactivate',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.params.id === req.user!.userId) {
        throw new AppError(400, 'Cannot deactivate yourself');
      }

      const result = await query(
        `UPDATE users SET is_active = FALSE WHERE id = $1 AND organization_id = $2 RETURNING id`,
        [req.params.id, req.user!.organizationId]
      );
      if (result.rows.length === 0) throw new AppError(404, 'User not found');
      res.json({ deactivated: true });
    } catch (err) {
      next(err);
    }
  }
);

// Reactivate team member
usersRouter.post(
  '/:id/reactivate',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        `UPDATE users SET is_active = TRUE WHERE id = $1 AND organization_id = $2 RETURNING id`,
        [req.params.id, req.user!.organizationId]
      );
      if (result.rows.length === 0) throw new AppError(404, 'User not found');
      res.json({ reactivated: true });
    } catch (err) {
      next(err);
    }
  }
);
