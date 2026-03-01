import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { query } from '@agenticmedia/database';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';

export const automationsRouter = Router();
automationsRouter.use(authenticate);

const createAutomationSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  triggerType: z.string().min(1),
  triggerConfig: z.record(z.unknown()).default({}),
  actions: z.array(z.record(z.unknown())).default([]),
  isActive: z.boolean().default(true),
});

const updateAutomationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  triggerType: z.string().min(1).optional(),
  triggerConfig: z.record(z.unknown()).optional(),
  actions: z.array(z.record(z.unknown())).optional(),
  isActive: z.boolean().optional(),
});

// List automation workflows
automationsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT * FROM automation_workflows
       WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [req.user!.organizationId]
    );
    res.json({ automations: result.rows });
  } catch (err) {
    next(err);
  }
});

// Get single automation
automationsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      'SELECT * FROM automation_workflows WHERE id = $1 AND organization_id = $2',
      [req.params.id, req.user!.organizationId]
    );
    if (result.rows.length === 0) {
      throw new AppError(404, 'Automation not found');
    }
    res.json({ automation: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Create automation
automationsRouter.post(
  '/',
  authorize('admin', 'talent_manager'),
  validate(createAutomationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, triggerType, triggerConfig, actions, isActive } = req.body;
      const id = uuidv4();

      await query(
        `INSERT INTO automation_workflows (id, organization_id, name, description, trigger_type, trigger_config, actions, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, req.user!.organizationId, name, description || null, triggerType,
         JSON.stringify(triggerConfig), JSON.stringify(actions), isActive]
      );

      const result = await query('SELECT * FROM automation_workflows WHERE id = $1', [id]);
      res.status(201).json({ automation: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// Update automation
automationsRouter.patch(
  '/:id',
  authorize('admin', 'talent_manager'),
  validate(updateAutomationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await query(
        'SELECT id FROM automation_workflows WHERE id = $1 AND organization_id = $2',
        [req.params.id, req.user!.organizationId]
      );
      if (existing.rows.length === 0) {
        throw new AppError(404, 'Automation not found');
      }

      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (req.body.name !== undefined) { updates.push(`name = $${paramIndex++}`); params.push(req.body.name); }
      if (req.body.description !== undefined) { updates.push(`description = $${paramIndex++}`); params.push(req.body.description); }
      if (req.body.triggerType !== undefined) { updates.push(`trigger_type = $${paramIndex++}`); params.push(req.body.triggerType); }
      if (req.body.triggerConfig !== undefined) { updates.push(`trigger_config = $${paramIndex++}`); params.push(JSON.stringify(req.body.triggerConfig)); }
      if (req.body.actions !== undefined) { updates.push(`actions = $${paramIndex++}`); params.push(JSON.stringify(req.body.actions)); }
      if (req.body.isActive !== undefined) { updates.push(`is_active = $${paramIndex++}`); params.push(req.body.isActive); }

      if (updates.length === 0) {
        throw new AppError(400, 'No fields to update');
      }

      params.push(req.params.id, req.user!.organizationId);
      await query(
        `UPDATE automation_workflows SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}`,
        params
      );

      const result = await query('SELECT * FROM automation_workflows WHERE id = $1', [req.params.id]);
      res.json({ automation: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// Delete automation
automationsRouter.delete(
  '/:id',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        'DELETE FROM automation_workflows WHERE id = $1 AND organization_id = $2 RETURNING id',
        [req.params.id, req.user!.organizationId]
      );
      if (result.rows.length === 0) {
        throw new AppError(404, 'Automation not found');
      }
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  }
);

// Toggle automation active/inactive
automationsRouter.post(
  '/:id/toggle',
  authorize('admin', 'talent_manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        `UPDATE automation_workflows SET is_active = NOT is_active
         WHERE id = $1 AND organization_id = $2
         RETURNING id, is_active`,
        [req.params.id, req.user!.organizationId]
      );
      if (result.rows.length === 0) {
        throw new AppError(404, 'Automation not found');
      }
      res.json({ id: result.rows[0].id, isActive: result.rows[0].is_active });
    } catch (err) {
      next(err);
    }
  }
);
