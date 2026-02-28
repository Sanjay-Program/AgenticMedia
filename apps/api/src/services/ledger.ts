import { v4 as uuidv4 } from 'uuid';
import { getClient, query } from '@agenticmedia/database';
import type { CreateLedgerTransactionInput } from '@agenticmedia/shared-types';
import { AppError } from '../middleware/error-handler';

/**
 * Creates a double-entry accounting transaction with balanced debits and credits.
 * This is idempotent — if the same idempotencyKey is used, it returns the existing transaction.
 * Credits and debits MUST balance to zero or the transaction is rejected.
 */
export async function createLedgerTransaction(
  input: CreateLedgerTransactionInput
): Promise<{ transactionId: string; entries: Array<{ id: string; entryType: string; amount: number }> }> {
  // Idempotency check
  const existing = await query(
    'SELECT id FROM financial_transactions WHERE idempotency_key = $1',
    [input.idempotencyKey]
  );

  if (existing.rows.length > 0) {
    const existingEntries = await query(
      'SELECT id, entry_type, amount FROM ledger_entries WHERE transaction_id = $1',
      [existing.rows[0].id]
    );
    return {
      transactionId: existing.rows[0].id,
      entries: existingEntries.rows.map((r: { id: string; entry_type: string; amount: string }) => ({
        id: r.id,
        entryType: r.entry_type,
        amount: parseFloat(r.amount),
      })),
    };
  }

  // Validate double-entry: total debits must equal total credits
  let totalDebits = 0;
  let totalCredits = 0;
  for (const entry of input.entries) {
    if (entry.amount <= 0) {
      throw new AppError(400, 'Ledger entry amounts must be positive');
    }
    if (entry.entryType === 'debit') {
      totalDebits += entry.amount;
    } else {
      totalCredits += entry.amount;
    }
  }

  // Use a small tolerance for floating point comparison
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new AppError(400, `Debits ($${totalDebits.toFixed(2)}) must equal credits ($${totalCredits.toFixed(2)})`);
  }

  const txId = uuidv4();
  const client = await getClient();
  const resultEntries: Array<{ id: string; entryType: string; amount: number }> = [];

  try {
    await client.query('BEGIN');

    // Create the transaction
    await client.query(
      `INSERT INTO financial_transactions (id, organization_id, reference_type, reference_id, description, status, idempotency_key, posted_at)
       VALUES ($1, $2, $3, $4, $5, 'posted', $6, NOW())`,
      [txId, input.organizationId, input.referenceType, input.referenceId || null, input.description, input.idempotencyKey]
    );

    // Create ledger entries and update account balances
    for (const entry of input.entries) {
      const entryId = uuidv4();
      const currency = entry.currency || 'USD';

      await client.query(
        `INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, currency)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [entryId, txId, entry.accountId, entry.entryType, entry.amount, currency]
      );

      // Update account balance: debits increase assets/expenses, credits increase liabilities/equity/revenue
      const balanceChange = entry.entryType === 'debit' ? entry.amount : -entry.amount;
      await client.query(
        `UPDATE ledger_accounts SET balance = balance + $1 WHERE id = $2`,
        [balanceChange, entry.accountId]
      );

      resultEntries.push({ id: entryId, entryType: entry.entryType, amount: entry.amount });
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { transactionId: txId, entries: resultEntries };
}

/**
 * Initializes the standard system accounts for a new organization.
 */
export async function initializeSystemAccounts(organizationId: string): Promise<void> {
  const systemAccounts = [
    { name: 'platform_revenue', type: 'revenue' },
    { name: 'agency_payable', type: 'liability' },
    { name: 'creator_payable', type: 'liability' },
    { name: 'cash_received', type: 'asset' },
    { name: 'accounts_receivable', type: 'asset' },
    { name: 'stripe_clearing', type: 'asset' },
  ];

  for (const acct of systemAccounts) {
    await query(
      `INSERT INTO ledger_accounts (id, organization_id, name, account_type, is_system_account)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (organization_id, name) DO NOTHING`,
      [uuidv4(), organizationId, acct.name, acct.type]
    );
  }
}
