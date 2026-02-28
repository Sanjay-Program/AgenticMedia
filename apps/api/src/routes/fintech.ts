import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { query, getClient } from '@agenticmedia/database';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';

export const fintechRouter = Router();
fintechRouter.use(authenticate);

const createCampaignDealSchema = z.object({
  creatorId: z.string().uuid(),
  brandContactId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  totalValue: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const createContractSchema = z.object({
  campaignId: z.string().uuid(),
  terms: z.record(z.unknown()),
  platformFeePercent: z.number().min(0).max(100).default(2),
  agencyFeePercent: z.number().min(0).max(100).default(15),
  creatorPayoutPercent: z.number().min(0).max(100).default(83),
});

// List campaigns/deals
fintechRouter.get('/campaigns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT cam.*, c.full_name as creator_name, bc.company_name as brand_name,
              sc.id as contract_id, sc.status as contract_status
       FROM campaigns cam
       JOIN creators c ON c.id = cam.creator_id
       LEFT JOIN brand_contacts bc ON bc.id = cam.brand_contact_id
       LEFT JOIN smart_contracts sc ON sc.campaign_id = cam.id
       WHERE cam.organization_id = $1
       ORDER BY cam.created_at DESC`,
      [req.user!.organizationId]
    );
    res.json({ campaigns: result.rows });
  } catch (err) {
    next(err);
  }
});

// Create a campaign deal
fintechRouter.post(
  '/campaigns',
  authorize('admin', 'talent_manager'),
  validate(createCampaignDealSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { creatorId, brandContactId, name, description, totalValue, currency, startDate, endDate } = req.body;
      const id = uuidv4();

      await query(
        `INSERT INTO campaigns (id, organization_id, creator_id, brand_contact_id, name, description, total_value, currency, start_date, end_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'negotiating')`,
        [id, req.user!.organizationId, creatorId, brandContactId || null, name, description || null, totalValue, currency, startDate || null, endDate || null]
      );

      const result = await query('SELECT * FROM campaigns WHERE id = $1', [id]);
      res.status(201).json({ campaign: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// Create smart contract for a campaign
fintechRouter.post(
  '/contracts',
  authorize('admin'),
  validate(createContractSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { campaignId, terms, platformFeePercent, agencyFeePercent, creatorPayoutPercent } = req.body;

      // Validate percentages sum to 100
      if (Math.abs(platformFeePercent + agencyFeePercent + creatorPayoutPercent - 100) > 0.01) {
        throw new AppError(400, 'Fee percentages must sum to 100');
      }

      // Verify campaign belongs to org
      const campaign = await query(
        'SELECT * FROM campaigns WHERE id = $1 AND organization_id = $2',
        [campaignId, req.user!.organizationId]
      );
      if (campaign.rows.length === 0) {
        throw new AppError(404, 'Campaign not found');
      }

      const id = uuidv4();
      await query(
        `INSERT INTO smart_contracts (id, campaign_id, terms, platform_fee_percent, agency_fee_percent, creator_payout_percent, total_amount, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')`,
        [id, campaignId, JSON.stringify(terms), platformFeePercent, agencyFeePercent, creatorPayoutPercent, campaign.rows[0].total_value]
      );

      const result = await query('SELECT * FROM smart_contracts WHERE id = $1', [id]);
      res.status(201).json({ contract: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// Process payment and create revenue splits
fintechRouter.post(
  '/contracts/:id/process-payment',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contractResult = await query(
        `SELECT sc.*, cam.organization_id, cam.creator_id
         FROM smart_contracts sc
         JOIN campaigns cam ON cam.id = sc.campaign_id
         WHERE sc.id = $1 AND cam.organization_id = $2`,
        [req.params.id, req.user!.organizationId]
      );

      if (contractResult.rows.length === 0) {
        throw new AppError(404, 'Contract not found');
      }

      const contract = contractResult.rows[0];
      if (contract.status !== 'active') {
        throw new AppError(400, 'Contract must be active to process payment');
      }

      const totalAmount = parseFloat(contract.total_amount);
      const platformAmount = totalAmount * (parseFloat(contract.platform_fee_percent) / 100);
      const agencyAmount = totalAmount * (parseFloat(contract.agency_fee_percent) / 100);
      const creatorAmount = totalAmount * (parseFloat(contract.creator_payout_percent) / 100);

      // Create revenue splits in a transaction
      const client = await getClient();
      try {
        await client.query('BEGIN');

        // Platform fee split
        await client.query(
          `INSERT INTO revenue_splits (id, smart_contract_id, recipient_type, recipient_id, amount, currency, status)
           VALUES ($1, $2, 'platform', $3, $4, 'USD', 'pending')`,
          [uuidv4(), contract.id, contract.organization_id, platformAmount]
        );

        // Agency split
        await client.query(
          `INSERT INTO revenue_splits (id, smart_contract_id, recipient_type, recipient_id, amount, currency, status)
           VALUES ($1, $2, 'agency', $3, $4, 'USD', 'pending')`,
          [uuidv4(), contract.id, contract.organization_id, agencyAmount]
        );

        // Creator split
        await client.query(
          `INSERT INTO revenue_splits (id, smart_contract_id, recipient_type, recipient_id, amount, currency, status)
           VALUES ($1, $2, 'creator', $3, $4, 'USD', 'pending')`,
          [uuidv4(), contract.id, contract.creator_id, creatorAmount]
        );

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      // Return the splits
      const splits = await query(
        'SELECT * FROM revenue_splits WHERE smart_contract_id = $1 ORDER BY recipient_type',
        [contract.id]
      );

      res.json({
        message: 'Revenue splits created',
        splits: splits.rows,
        breakdown: {
          total: totalAmount,
          platform: platformAmount,
          agency: agencyAmount,
          creator: creatorAmount,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Get revenue splits for a contract
fintechRouter.get(
  '/contracts/:id/splits',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        `SELECT rs.* FROM revenue_splits rs
         JOIN smart_contracts sc ON sc.id = rs.smart_contract_id
         JOIN campaigns cam ON cam.id = sc.campaign_id
         WHERE sc.id = $1 AND cam.organization_id = $2
         ORDER BY rs.recipient_type`,
        [req.params.id, req.user!.organizationId]
      );
      res.json({ splits: result.rows });
    } catch (err) {
      next(err);
    }
  }
);
