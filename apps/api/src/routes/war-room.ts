/**
 * War Room Routes
 *
 * /api/war-room — Live revenue tickers, risk heatmaps, portfolio view
 */
import { Router, Request, Response, NextFunction } from 'express';
import { query } from '@agenticmedia/database';
import { calculatePortfolioHealth, classifyRiskColor } from '@agenticmedia/shared-types';
import type { PortfolioCreator } from '@agenticmedia/shared-types';

const warRoomRouter = Router();

// ──────────────────────────────────────────────────────────────
// Live Revenue Ticker
// ──────────────────────────────────────────────────────────────

/**
 * GET /api/war-room/ticker
 * Real-time revenue overview.
 */
warRoomRouter.get(
  '/ticker',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Query aggregated financial data
      const result = await query(
        `SELECT
           COALESCE(SUM(CASE WHEN ft.type = 'campaign_payout' THEN ft.amount ELSE 0 END), 0) as total_gmv,
           COALESCE(SUM(CASE WHEN ft.type = 'platform_fee' THEN ft.amount ELSE 0 END), 0) as platform_fee
         FROM financial_transactions ft
         WHERE ft.organization_id = $1
           AND ft.created_at >= NOW() - INTERVAL '30 days'`,
        [req.user!.organizationId]
      );

      const row = result.rows[0] || {};
      const gmv = parseFloat(row.total_gmv) || 0;
      const platformFee = parseFloat(row.platform_fee) || 0;

      res.json({
        organizationId: req.user!.organizationId,
        timestamp: new Date().toISOString(),
        gmv,
        platformFee,
        creatorRevenue: Math.round(gmv * 0.83 * 100) / 100,
        agencyShare: Math.round(gmv * 0.15 * 100) / 100,
        periodStart: new Date(Date.now() - 30 * 86400000).toISOString(),
        periodEnd: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────
// Risk Heatmap
// ──────────────────────────────────────────────────────────────

/**
 * GET /api/war-room/risk-heatmap
 * Creator risk heatmap for the organization.
 */
warRoomRouter.get(
  '/risk-heatmap',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        `SELECT cra.creator_id, cra.overall_risk_score, cra.risk_level, cra.assessed_at,
                c.name as creator_name
         FROM creator_risk_assessments cra
         JOIN creators c ON c.id = cra.creator_id
         WHERE cra.organization_id = $1
         ORDER BY cra.overall_risk_score DESC
         LIMIT 50`,
        [req.user!.organizationId]
      );

      const heatmap = result.rows.map((row: any) => ({
        creatorId: row.creator_id,
        creatorName: row.creator_name || 'Unknown',
        riskScore: row.overall_risk_score,
        color: classifyRiskColor(row.overall_risk_score),
        primaryRisk: row.risk_level,
        revenueAtRisk: 0, // Would be joined from LTV data
        lastUpdated: row.assessed_at,
      }));

      res.json({ heatmap });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────
// Portfolio View
// ──────────────────────────────────────────────────────────────

/**
 * GET /api/war-room/portfolio
 * Agency portfolio overview with health index.
 */
warRoomRouter.get(
  '/portfolio',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        `SELECT c.id, c.name, c.created_at
         FROM creators c
         WHERE c.organization_id = $1
         ORDER BY c.created_at DESC
         LIMIT 100`,
        [req.user!.organizationId]
      );

      // Build portfolio creators (in production, joins with analytics tables)
      const creators: PortfolioCreator[] = result.rows.map((row: any, idx: number) => ({
        creatorId: row.id,
        name: row.name,
        platform: 'youtube',
        followers: 0,
        engagementRate: 0,
        ltv12Month: 0,
        riskScore: 0,
        activeCampaigns: 0,
        totalRevenue: 0,
        ranking: idx + 1,
        trend: 'stable' as const,
      }));

      const healthIndex = calculatePortfolioHealth(creators);

      res.json({
        organizationId: req.user!.organizationId,
        creators,
        totalCreators: creators.length,
        healthIndex,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────
// War Room Snapshot
// ──────────────────────────────────────────────────────────────

/**
 * POST /api/war-room/snapshot
 * Capture a point-in-time war room snapshot.
 */
warRoomRouter.post(
  '/snapshot',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query(
        `INSERT INTO war_room_snapshots
         (id, organization_id, snapshot_data, captured_at)
         VALUES (gen_random_uuid(), $1, $2, NOW())`,
        [req.user!.organizationId, JSON.stringify(req.body)]
      );

      res.status(201).json({
        message: 'War room snapshot captured',
        capturedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

export { warRoomRouter };
