import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { query, getClient } from '@agenticmedia/database';
import { generateTokenPair, hashToken, verifyAccessToken } from '../utils/tokens';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { AppError } from '../middleware/error-handler';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(255),
  organizationName: z.string().min(1).max(255),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, fullName, organizationName } = req.body;

      // Check if user exists
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        throw new AppError(409, 'Email already registered');
      }

      const orgId = uuidv4();
      const userId = uuidv4();
      let slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Ensure slug uniqueness
      const slugExists = await query('SELECT id FROM organizations WHERE slug = $1', [slug]);
      if (slugExists.rows.length > 0) {
        slug = `${slug}-${userId.substring(0, 8)}`;
      }
      const passwordHash = await bcrypt.hash(password, 12);

      // Create organization and admin user in transaction
      const client = await getClient();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO organizations (id, name, slug, plan_tier) VALUES ($1, $2, $3, 'starter')`,
          [orgId, organizationName, slug]
        );
        await client.query(
          `INSERT INTO users (id, organization_id, email, password_hash, full_name, role) 
           VALUES ($1, $2, $3, $4, $5, 'admin')`,
          [userId, orgId, email, passwordHash, fullName]
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      const tokens = generateTokenPair({
        userId,
        organizationId: orgId,
        role: 'admin',
      });

      // Store refresh token
      await query(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) 
         VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
        [uuidv4(), userId, tokens.refreshTokenHash]
      );

      res.status(201).json({
        user: { id: userId, email, fullName, role: 'admin', organizationId: orgId },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const result = await query(
        `SELECT id, organization_id, email, password_hash, full_name, role, is_active 
         FROM users WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        throw new AppError(401, 'Invalid email or password');
      }

      const user = result.rows[0];
      if (!user.is_active) {
        throw new AppError(403, 'Account is deactivated');
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        throw new AppError(401, 'Invalid email or password');
      }

      const tokens = generateTokenPair({
        userId: user.id,
        organizationId: user.organization_id,
        role: user.role,
      });

      // Store refresh token and update last login
      await query(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) 
         VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
        [uuidv4(), user.id, tokens.refreshTokenHash]
      );
      await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          organizationId: user.organization_id,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new AppError(400, 'Refresh token required');
      }

      const tokenHash = hashToken(refreshToken);
      const result = await query(
        `SELECT rt.id, rt.user_id, u.organization_id, u.role, u.is_active
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
         WHERE rt.token_hash = $1 AND rt.expires_at > NOW() AND rt.revoked_at IS NULL`,
        [tokenHash]
      );

      if (result.rows.length === 0) {
        throw new AppError(401, 'Invalid or expired refresh token');
      }

      const row = result.rows[0];
      if (!row.is_active) {
        throw new AppError(403, 'Account is deactivated');
      }

      // Revoke old token (rotation)
      await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [row.id]);

      // Issue new pair
      const tokens = generateTokenPair({
        userId: row.user_id,
        organizationId: row.organization_id,
        role: row.role,
      });

      await query(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) 
         VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
        [uuidv4(), row.user_id, tokens.refreshTokenHash]
      );

      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        `SELECT u.id, u.email, u.full_name, u.role, u.organization_id, u.is_active, u.last_login_at,
                o.name as organization_name, o.slug, o.plan_tier
         FROM users u
         JOIN organizations o ON o.id = u.organization_id
         WHERE u.id = $1`,
        [req.user!.userId]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, 'User not found');
      }

      res.json({ user: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);
