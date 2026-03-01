import { Router, Request, Response, NextFunction } from 'express';
import { query } from '@agenticmedia/database';
import { authenticate } from '../middleware/authenticate';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

// Dashboard KPI stats
dashboardRouter.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.organizationId;

    const [creators, campaigns, agentRuns, pendingPayouts, recentDeals, revenue] = await Promise.all([
      query('SELECT COUNT(*) FROM creators WHERE organization_id = $1', [orgId]),
      query('SELECT COUNT(*) FROM campaigns WHERE organization_id = $1', [orgId]),
      query('SELECT COUNT(*) FROM agent_runs WHERE organization_id = $1', [orgId]),
      query(
        `SELECT COALESCE(SUM(rs.amount), 0) as total
         FROM revenue_splits rs
         JOIN smart_contracts sc ON sc.id = rs.smart_contract_id
         JOIN campaigns cam ON cam.id = sc.campaign_id
         WHERE cam.organization_id = $1 AND rs.status = 'pending'`,
        [orgId]
      ),
      query(
        `SELECT cam.id, cam.name, cam.status, cam.total_value, cam.currency,
                c.full_name as creator_name, bc.company_name as brand_name
         FROM campaigns cam
         JOIN creators c ON c.id = cam.creator_id
         LEFT JOIN brand_contacts bc ON bc.id = cam.brand_contact_id
         WHERE cam.organization_id = $1
         ORDER BY cam.created_at DESC LIMIT 10`,
        [orgId]
      ),
      query(
        `SELECT COALESCE(SUM(cam.total_value), 0) as gmv
         FROM campaigns cam
         WHERE cam.organization_id = $1 AND cam.status IN ('active', 'completed')`,
        [orgId]
      ),
    ]);

    const activeDeals = await query(
      `SELECT COUNT(*) FROM campaigns WHERE organization_id = $1 AND status IN ('negotiating', 'active')`,
      [orgId]
    );

    const todayRuns = await query(
      `SELECT COUNT(*) FROM agent_runs WHERE organization_id = $1 AND created_at >= CURRENT_DATE`,
      [orgId]
    );

    res.json({
      stats: {
        totalGMV: parseFloat(revenue.rows[0].gmv),
        activeDeals: parseInt(activeDeals.rows[0].count, 10),
        totalCreators: parseInt(creators.rows[0].count, 10),
        totalCampaigns: parseInt(campaigns.rows[0].count, 10),
        totalAgentRuns: parseInt(agentRuns.rows[0].count, 10),
        agentRunsToday: parseInt(todayRuns.rows[0].count, 10),
        pendingPayouts: parseFloat(pendingPayouts.rows[0].total),
      },
      recentDeals: recentDeals.rows,
    });
  } catch (err) {
    next(err);
  }
});

// Activity feed - recent events across the org
dashboardRouter.get('/activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = '20' } = req.query;
    const result = await query(
      `SELECT id, actor_type, action, resource_type, resource_id, metadata, created_at
       FROM audit_events
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.user!.organizationId, Number(limit)]
    );
    res.json({ activity: result.rows });
  } catch (err) {
    next(err);
  }
});
