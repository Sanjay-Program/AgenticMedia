import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { query } from '@agenticmedia/database';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import { getOutreachQueue } from '../queues';

export const outreachRouter = Router();
outreachRouter.use(authenticate);

const createCampaignSchema = z.object({
  creatorId: z.string().uuid(),
  name: z.string().min(1).max(255),
  targetIndustry: z.string().max(255).optional(),
  budgetRangeMin: z.number().min(0).optional(),
  budgetRangeMax: z.number().min(0).optional(),
});

const addContactSchema = z.object({
  companyName: z.string().min(1).max(255),
  contactName: z.string().min(1).max(255),
  contactEmail: z.string().email(),
  contactTitle: z.string().max(255).optional(),
  linkedinUrl: z.string().url().optional(),
  source: z.enum(['apollo', 'zoominfo', 'manual']).default('manual'),
});

// List outreach campaigns
outreachRouter.get('/campaigns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT oc.*, c.full_name as creator_name,
              (SELECT COUNT(*) FROM outreach_emails oe WHERE oe.campaign_id = oc.id) as email_count,
              (SELECT COUNT(*) FROM outreach_emails oe WHERE oe.campaign_id = oc.id AND oe.status = 'replied') as reply_count
       FROM outreach_campaigns oc
       JOIN creators c ON c.id = oc.creator_id
       WHERE oc.organization_id = $1
       ORDER BY oc.created_at DESC`,
      [req.user!.organizationId]
    );
    res.json({ campaigns: result.rows });
  } catch (err) {
    next(err);
  }
});

// Create outreach campaign
outreachRouter.post(
  '/campaigns',
  authorize('admin', 'talent_manager'),
  validate(createCampaignSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { creatorId, name, targetIndustry, budgetRangeMin, budgetRangeMax } = req.body;
      const id = uuidv4();

      // Verify creator belongs to org
      const creator = await query(
        'SELECT id FROM creators WHERE id = $1 AND organization_id = $2',
        [creatorId, req.user!.organizationId]
      );
      if (creator.rows.length === 0) {
        throw new AppError(404, 'Creator not found');
      }

      await query(
        `INSERT INTO outreach_campaigns (id, organization_id, creator_id, name, target_industry, budget_range_min, budget_range_max, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')`,
        [id, req.user!.organizationId, creatorId, name, targetIndustry || null, budgetRangeMin || null, budgetRangeMax || null]
      );

      const result = await query('SELECT * FROM outreach_campaigns WHERE id = $1', [id]);
      res.status(201).json({ campaign: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// Launch campaign - enqueue BullMQ jobs for each contact
outreachRouter.post(
  '/campaigns/:id/launch',
  authorize('admin', 'talent_manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaignResult = await query(
        `SELECT oc.*, c.full_name as creator_name
         FROM outreach_campaigns oc
         JOIN creators c ON c.id = oc.creator_id
         WHERE oc.id = $1 AND oc.organization_id = $2`,
        [req.params.id, req.user!.organizationId]
      );

      if (campaignResult.rows.length === 0) {
        throw new AppError(404, 'Campaign not found');
      }

      const campaign = campaignResult.rows[0];
      if (campaign.status !== 'draft' && campaign.status !== 'paused') {
        throw new AppError(400, 'Campaign must be in draft or paused status to launch');
      }

      // Get all brand contacts for queued emails in this campaign
      const emails = await query(
        `SELECT oe.id as email_id, oe.brand_contact_id, bc.contact_email, bc.contact_name, bc.company_name
         FROM outreach_emails oe
         JOIN brand_contacts bc ON bc.id = oe.brand_contact_id
         WHERE oe.campaign_id = $1 AND oe.status = 'queued'`,
        [req.params.id]
      );

      // Enqueue email generation jobs via BullMQ concurrently
      const outreachQueue = getOutreachQueue();
      await Promise.all(emails.rows.map((email) =>
        outreachQueue.add('generate-email', {
          organizationId: req.user!.organizationId,
          campaignId: req.params.id,
          emailId: email.email_id,
          brandContactId: email.brand_contact_id,
          creatorId: campaign.creator_id,
          creatorName: campaign.creator_name,
          contactName: email.contact_name,
          contactEmail: email.contact_email,
          companyName: email.company_name,
        })
      ));

      // Update campaign status
      await query(
        `UPDATE outreach_campaigns SET status = 'active' WHERE id = $1`,
        [req.params.id]
      );

      res.json({ 
        message: 'Campaign launched',
        emailsQueued: emails.rows.length,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Add brand contact
outreachRouter.post(
  '/contacts',
  authorize('admin', 'talent_manager'),
  validate(addContactSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyName, contactName, contactEmail, contactTitle, linkedinUrl, source } = req.body;
      const id = uuidv4();

      await query(
        `INSERT INTO brand_contacts (id, organization_id, company_name, contact_name, contact_email, contact_title, linkedin_url, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, req.user!.organizationId, companyName, contactName, contactEmail, contactTitle || null, linkedinUrl || null, source]
      );

      const result = await query('SELECT * FROM brand_contacts WHERE id = $1', [id]);
      res.status(201).json({ contact: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// List brand contacts
outreachRouter.get('/contacts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT * FROM brand_contacts WHERE organization_id = $1 ORDER BY created_at DESC`,
      [req.user!.organizationId]
    );
    res.json({ contacts: result.rows });
  } catch (err) {
    next(err);
  }
});
