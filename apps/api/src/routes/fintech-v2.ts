/**
 * Fintech V2 Routes
 *
 * /api/fintech-v2 — Revenue-based financing, insurance, banking
 */
import { Router, Request, Response, NextFunction } from 'express';
import { query } from '@agenticmedia/database';
import { AppError } from '../middleware/error-handler';
import {
  calculateMaxFinancingAmount,
  calculateInsurancePremium,
} from '@agenticmedia/shared-types';
import type { InsuranceType } from '@agenticmedia/shared-types';

const fintechV2Router = Router();

// ──────────────────────────────────────────────────────────────
// Revenue-Based Financing
// ──────────────────────────────────────────────────────────────

/**
 * POST /api/fintech-v2/financing/eligibility
 * Check financing eligibility for a creator.
 */
fintechV2Router.post(
  '/financing/eligibility',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { creatorId, predictedSixMonthRevenue, creditScore, existingDebt = 0 } = req.body;

      if (!creatorId || predictedSixMonthRevenue === undefined || creditScore === undefined) {
        throw new AppError(400, 'creatorId, predictedSixMonthRevenue, and creditScore are required');
      }

      const maxAmount = calculateMaxFinancingAmount(predictedSixMonthRevenue, creditScore, existingDebt);
      const repaymentRate = creditScore >= 80 ? 0.05 : creditScore >= 60 ? 0.06 : 0.08;

      res.json({
        creatorId,
        eligible: maxAmount > 0,
        maxFinancingAmount: maxAmount,
        suggestedRepaymentRate: repaymentRate,
        predictedSixMonthRevenue,
        creditScore,
        existingDebt,
        estimatedMonthlyRepayment: maxAmount > 0
          ? Math.round((predictedSixMonthRevenue / 6) * repaymentRate * 100) / 100
          : 0,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/fintech-v2/financing/apply
 * Submit a financing application.
 */
fintechV2Router.post(
  '/financing/apply',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { creatorId, requestedAmount, predictedSixMonthRevenue, creditScore } = req.body;

      if (!creatorId || !requestedAmount || !predictedSixMonthRevenue || !creditScore) {
        throw new AppError(400, 'creatorId, requestedAmount, predictedSixMonthRevenue, and creditScore are required');
      }

      const maxAmount = calculateMaxFinancingAmount(predictedSixMonthRevenue, creditScore, 0);

      if (requestedAmount > maxAmount) {
        throw new AppError(400, `Requested amount exceeds maximum eligible amount of $${maxAmount}`);
      }

      const result = await query(
        `INSERT INTO financing_applications
         (id, creator_id, organization_id, requested_amount, predicted_six_month_revenue,
          risk_score, repayment_rate, status, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'pending', NOW())
         RETURNING id, status`,
        [
          creatorId, req.user!.organizationId,
          requestedAmount, predictedSixMonthRevenue,
          100 - creditScore, // risk = inverse of credit
          creditScore >= 80 ? 0.05 : 0.06,
        ]
      );

      res.status(201).json({
        applicationId: result.rows[0]?.id || `fin_${Date.now()}`,
        status: 'pending',
        requestedAmount,
        maxEligible: maxAmount,
        message: 'Application submitted for review',
      });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────
// Creator Insurance
// ──────────────────────────────────────────────────────────────

/**
 * POST /api/fintech-v2/insurance/quote
 * Get an insurance premium quote.
 */
fintechV2Router.post(
  '/insurance/quote',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { creatorId, type, coverageAmount, riskScore } = req.body;

      if (!creatorId || !type || !coverageAmount || riskScore === undefined) {
        throw new AppError(400, 'creatorId, type, coverageAmount, and riskScore are required');
      }

      const validTypes: InsuranceType[] = ['brand_cancellation', 'revenue_drop', 'pr_crisis', 'copyright_strike'];
      if (!validTypes.includes(type)) {
        throw new AppError(400, `type must be one of: ${validTypes.join(', ')}`);
      }

      const monthlyPremium = calculateInsurancePremium(coverageAmount, riskScore, type);

      res.json({
        creatorId,
        type,
        coverageAmount,
        riskScore,
        monthlyPremium,
        annualPremium: Math.round(monthlyPremium * 12 * 100) / 100,
        deductible: Math.round(coverageAmount * 0.10 * 100) / 100,
        validForDays: 30,
        quotedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/fintech-v2/insurance/policies/:creatorId
 * List active insurance policies for a creator.
 */
fintechV2Router.get(
  '/insurance/policies/:creatorId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        `SELECT * FROM insurance_policies
         WHERE creator_id = $1 AND organization_id = $2
         ORDER BY created_at DESC`,
        [req.params.creatorId, req.user!.organizationId]
      );

      res.json({ policies: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────
// Creator Banking Status
// ──────────────────────────────────────────────────────────────

/**
 * GET /api/fintech-v2/banking/status/:creatorId
 * Get creator banking account status.
 */
fintechV2Router.get(
  '/banking/status/:creatorId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // In production, queries Stripe Treasury or partner banking API
      res.json({
        creatorId: req.params.creatorId,
        accountStatus: 'not_enrolled',
        currency: 'USD',
        balance: 0,
        pendingBalance: 0,
        message: 'Creator banking requires Stripe Treasury enrollment',
      });
    } catch (err) {
      next(err);
    }
  }
);

export { fintechV2Router };
