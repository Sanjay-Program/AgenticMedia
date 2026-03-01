import { Router, Request, Response, NextFunction } from 'express';
import { query } from '@agenticmedia/database';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

export const auditRouter = Router();
auditRouter.use(authenticate);

// List audit events (admin/data_analyst only)
auditRouter.get(
  '/events',
  authorize('admin', 'data_analyst'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { action, resourceType, actorType, page = '1', limit = '50' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const conditions: string[] = ['organization_id = $1'];
      const params: unknown[] = [req.user!.organizationId];
      let paramIndex = 2;

      if (action) { conditions.push(`action = $${paramIndex++}`); params.push(action); }
      if (resourceType) { conditions.push(`resource_type = $${paramIndex++}`); params.push(resourceType); }
      if (actorType) { conditions.push(`actor_type = $${paramIndex++}`); params.push(actorType); }

      params.push(Number(limit), offset);

      const result = await query(
        `SELECT id, actor_type, actor_id, action, resource_type, resource_id, metadata, ip_address, created_at
         FROM audit_events
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
      );

      const countResult = await query(
        `SELECT COUNT(*) FROM audit_events WHERE ${conditions.slice(0, -0).join(' AND ')}`,
        params.slice(0, conditions.length)
      );

      res.json({
        events: result.rows,
        total: parseInt(countResult.rows[0].count, 10),
        page: Number(page),
        limit: Number(limit),
      });
    } catch (err) {
      next(err);
    }
  }
);

// Get audit summary stats
auditRouter.get(
  '/summary',
  authorize('admin', 'data_analyst'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.organizationId;

      const [byAction, byResource, byActor, recent] = await Promise.all([
        query(
          `SELECT action, COUNT(*) as count FROM audit_events
           WHERE organization_id = $1 GROUP BY action ORDER BY count DESC`,
          [orgId]
        ),
        query(
          `SELECT resource_type, COUNT(*) as count FROM audit_events
           WHERE organization_id = $1 GROUP BY resource_type ORDER BY count DESC LIMIT 10`,
          [orgId]
        ),
        query(
          `SELECT actor_type, COUNT(*) as count FROM audit_events
           WHERE organization_id = $1 GROUP BY actor_type ORDER BY count DESC`,
          [orgId]
        ),
        query(
          `SELECT COUNT(*) as count FROM audit_events
           WHERE organization_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
          [orgId]
        ),
      ]);

      res.json({
        byAction: byAction.rows,
        byResourceType: byResource.rows,
        byActorType: byActor.rows,
        last24Hours: parseInt(recent.rows[0].count, 10),
      });
    } catch (err) {
      next(err);
    }
  }
);
