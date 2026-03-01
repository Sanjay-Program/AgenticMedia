import { Router, Request, Response, NextFunction } from 'express';
import { query } from '@agenticmedia/database';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { initializeSystemAccounts } from '../services/ledger';

export const ledgerRouter = Router();
ledgerRouter.use(authenticate);

// List ledger accounts
ledgerRouter.get('/accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT id, name, account_type, currency, balance, is_system_account, created_at
       FROM ledger_accounts WHERE organization_id = $1 ORDER BY name`,
      [req.user!.organizationId]
    );
    res.json({ accounts: result.rows });
  } catch (err) {
    next(err);
  }
});

// Initialize system accounts (idempotent)
ledgerRouter.post(
  '/accounts/initialize',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await initializeSystemAccounts(req.user!.organizationId);
      const result = await query(
        `SELECT id, name, account_type, currency, balance FROM ledger_accounts
         WHERE organization_id = $1 AND is_system_account = TRUE ORDER BY name`,
        [req.user!.organizationId]
      );
      res.json({ accounts: result.rows, initialized: true });
    } catch (err) {
      next(err);
    }
  }
);

// List financial transactions
ledgerRouter.get('/transactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions: string[] = ['ft.organization_id = $1'];
    const params: unknown[] = [req.user!.organizationId];
    let paramIndex = 2;

    if (status) { conditions.push(`ft.status = $${paramIndex++}`); params.push(status); }

    params.push(Number(limit), offset);

    const result = await query(
      `SELECT ft.id, ft.reference_type, ft.reference_id, ft.description, ft.status,
              ft.posted_at, ft.created_at,
              json_agg(json_build_object(
                'id', le.id, 'accountId', le.account_id, 'entryType', le.entry_type,
                'amount', le.amount, 'currency', le.currency
              )) as entries
       FROM financial_transactions ft
       LEFT JOIN ledger_entries le ON le.transaction_id = ft.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY ft.id
       ORDER BY ft.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    res.json({
      transactions: result.rows,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    next(err);
  }
});

// Get account balance summary
ledgerRouter.get('/balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT account_type,
              COUNT(*) as account_count,
              SUM(balance) as total_balance,
              currency
       FROM ledger_accounts
       WHERE organization_id = $1
       GROUP BY account_type, currency
       ORDER BY account_type`,
      [req.user!.organizationId]
    );
    res.json({ balances: result.rows });
  } catch (err) {
    next(err);
  }
});

// Get transaction balance check (audit view)
ledgerRouter.get(
  '/balance-check',
  authorize('admin', 'data_analyst'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        `SELECT ltb.transaction_id, ltb.total_debits, ltb.total_credits, ltb.balance,
                ft.description, ft.status, ft.created_at
         FROM ledger_transaction_balance ltb
         JOIN financial_transactions ft ON ft.id = ltb.transaction_id
         WHERE ft.organization_id = $1
         ORDER BY ft.created_at DESC
         LIMIT 100`,
        [req.user!.organizationId]
      );

      const unbalanced = result.rows.filter((r: { balance: string }) => parseFloat(r.balance) !== 0);

      res.json({
        transactions: result.rows,
        unbalancedCount: unbalanced.length,
        isHealthy: unbalanced.length === 0,
      });
    } catch (err) {
      next(err);
    }
  }
);
