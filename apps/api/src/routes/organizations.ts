import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '@agenticmedia/database';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';

export const organizationsRouter = Router();
organizationsRouter.use(authenticate);

const updateOrgSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  customDomain: z.string().max(255).optional().nullable(),
  brandingConfig: z.record(z.unknown()).optional(),
});

// Get current organization
organizationsRouter.get('/current', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT o.*, (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as member_count
       FROM organizations o WHERE o.id = $1`,
      [req.user!.organizationId]
    );
    if (result.rows.length === 0) throw new AppError(404, 'Organization not found');
    res.json({ organization: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Update organization settings
organizationsRouter.patch(
  '/current',
  authorize('admin'),
  validate(updateOrgSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (req.body.name !== undefined) { updates.push(`name = $${paramIndex++}`); params.push(req.body.name); }
      if (req.body.customDomain !== undefined) { updates.push(`custom_domain = $${paramIndex++}`); params.push(req.body.customDomain); }
      if (req.body.brandingConfig !== undefined) { updates.push(`branding_config = $${paramIndex++}`); params.push(JSON.stringify(req.body.brandingConfig)); }

      if (updates.length === 0) throw new AppError(400, 'No fields to update');

      params.push(req.user!.organizationId);
      await query(`UPDATE organizations SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params);

      const result = await query('SELECT * FROM organizations WHERE id = $1', [req.user!.organizationId]);
      res.json({ organization: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// Get organization billing summary
organizationsRouter.get('/billing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.organizationId;

    const [org, accounts, transactions, splits] = await Promise.all([
      query('SELECT plan_tier, stripe_account_id FROM organizations WHERE id = $1', [orgId]),
      query(
        `SELECT name, account_type, balance, currency FROM ledger_accounts
         WHERE organization_id = $1 AND is_system_account = TRUE ORDER BY name`,
        [orgId]
      ),
      query(
        `SELECT COUNT(*) as count, COALESCE(SUM(CASE WHEN le.entry_type = 'debit' THEN le.amount ELSE 0 END), 0) as total_debits,
                COALESCE(SUM(CASE WHEN le.entry_type = 'credit' THEN le.amount ELSE 0 END), 0) as total_credits
         FROM financial_transactions ft
         JOIN ledger_entries le ON le.transaction_id = ft.id
         WHERE ft.organization_id = $1 AND ft.status = 'posted'`,
        [orgId]
      ),
      query(
        `SELECT rs.recipient_type, rs.status, COUNT(*) as count, COALESCE(SUM(rs.amount), 0) as total
         FROM revenue_splits rs
         JOIN smart_contracts sc ON sc.id = rs.smart_contract_id
         JOIN campaigns cam ON cam.id = sc.campaign_id
         WHERE cam.organization_id = $1
         GROUP BY rs.recipient_type, rs.status`,
        [orgId]
      ),
    ]);

    res.json({
      planTier: org.rows[0]?.plan_tier || 'starter',
      stripeConnected: !!org.rows[0]?.stripe_account_id,
      ledgerAccounts: accounts.rows,
      transactionSummary: {
        count: parseInt(transactions.rows[0].count, 10),
        totalDebits: parseFloat(transactions.rows[0].total_debits),
        totalCredits: parseFloat(transactions.rows[0].total_credits),
      },
      splitsSummary: splits.rows,
    });
  } catch (err) {
    next(err);
  }
});
