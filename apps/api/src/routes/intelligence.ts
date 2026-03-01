/**
 * Creator Intelligence Routes
 *
 * /api/intelligence — Risk assessment, audience quality, LTV predictions
 */
import { Router, Request, Response, NextFunction } from 'express';
import { query } from '@agenticmedia/database';
import { AppError } from '../middleware/error-handler';
import { assessCreatorRisk } from '../services/agents/creator-risk';
import { predictCreatorLTV } from '../services/agents/ltv-predictor';

const intelligenceRouter = Router();

// ──────────────────────────────────────────────────────────────
// Creator Risk Assessment
// ──────────────────────────────────────────────────────────────

/**
 * POST /api/intelligence/risk-assessment
 * Compute a full risk assessment for a creator.
 */
intelligenceRouter.post(
  '/risk-assessment',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        creatorId,
        controversyMentions = 0,
        politicalContentRatio = 0,
        sentimentVolatility = 0,
        copyrightStrikes = 0,
        communityStrikes = 0,
        negativeCommentRatio = 0,
        audienceToxicitySignals = 0,
        followerCount = 0,
        recentUnfollowSpike = false,
      } = req.body;

      if (!creatorId) throw new AppError(400, 'creatorId is required');

      const assessment = assessCreatorRisk({
        creatorId,
        organizationId: req.user!.organizationId,
        controversyMentions,
        politicalContentRatio,
        sentimentVolatility,
        copyrightStrikes,
        communityStrikes,
        negativeCommentRatio,
        audienceToxicitySignals,
        followerCount,
        recentUnfollowSpike,
      });

      // Store in DB
      await query(
        `INSERT INTO creator_risk_assessments
         (id, creator_id, organization_id, overall_risk_score, risk_level,
          cancel_probability, reputation_volatility, audience_toxicity_score,
          signals, assessed_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT DO NOTHING`,
        [
          creatorId, req.user!.organizationId,
          assessment.overallRiskScore, assessment.riskLevel,
          assessment.cancelProbability, assessment.reputationVolatility,
          assessment.audienceToxicityScore, JSON.stringify(assessment.signals),
        ]
      );

      res.json(assessment);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/intelligence/risk-assessment/:creatorId
 * Get latest risk assessment for a creator.
 */
intelligenceRouter.get(
  '/risk-assessment/:creatorId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        `SELECT * FROM creator_risk_assessments
         WHERE creator_id = $1 AND organization_id = $2
         ORDER BY assessed_at DESC LIMIT 1`,
        [req.params.creatorId, req.user!.organizationId]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, 'No risk assessment found for this creator');
      }

      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────
// Audience Quality Analysis
// ──────────────────────────────────────────────────────────────

/**
 * GET /api/intelligence/audience-quality/:creatorId
 * Get audience quality metrics.
 */
intelligenceRouter.get(
  '/audience-quality/:creatorId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // In production, this queries stored audience analysis data
      // For now, return structured response format
      res.json({
        creatorId: req.params.creatorId,
        platform: req.query.platform || 'youtube',
        botPercentage: 0,
        engagementAuthenticity: 0,
        geographicFraudScore: 0,
        suspiciousCommentClusters: 0,
        inorganicSpikeCount: 0,
        overallQualityScore: 0,
        analyzedAt: new Date().toISOString(),
        message: 'Queue an audience quality scan via POST to populate data',
      });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────
// Creator LTV Prediction
// ──────────────────────────────────────────────────────────────

/**
 * POST /api/intelligence/ltv-prediction
 * Generate a lifetime value prediction for a creator.
 */
intelligenceRouter.post(
  '/ltv-prediction',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        creatorId,
        monthlyRevenues = [],
        followerGrowthRate = 0,
        engagementRate = 0,
        platformCount = 1,
        avgCampaignValue = 0,
        campaignsPerMonth = 0,
        contentFrequency = 0,
        monthsActive = 0,
      } = req.body;

      if (!creatorId) throw new AppError(400, 'creatorId is required');

      const prediction = predictCreatorLTV({
        creatorId,
        organizationId: req.user!.organizationId,
        monthlyRevenues,
        followerGrowthRate,
        engagementRate,
        platformCount,
        avgCampaignValue,
        campaignsPerMonth,
        contentFrequency,
        monthsActive,
      });

      // Store prediction
      await query(
        `INSERT INTO creator_ltv_predictions
         (id, creator_id, organization_id, six_month_revenue, twelve_month_revenue,
          viral_probability, plateau_risk_score, burnout_risk_score,
          growth_trajectory, confidence_score, predicted_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT DO NOTHING`,
        [
          creatorId, req.user!.organizationId,
          prediction.sixMonthRevenue, prediction.twelveMonthRevenue,
          prediction.viralProbability, prediction.plateauRiskScore,
          prediction.burnoutRiskScore, prediction.growthTrajectory,
          prediction.confidenceScore,
        ]
      );

      res.json(prediction);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/intelligence/ltv-prediction/:creatorId
 * Get latest LTV prediction.
 */
intelligenceRouter.get(
  '/ltv-prediction/:creatorId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        `SELECT * FROM creator_ltv_predictions
         WHERE creator_id = $1 AND organization_id = $2
         ORDER BY predicted_at DESC LIMIT 1`,
        [req.params.creatorId, req.user!.organizationId]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, 'No LTV prediction found for this creator');
      }

      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

export { intelligenceRouter };
