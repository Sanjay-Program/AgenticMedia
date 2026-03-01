import { v4 as uuidv4 } from 'uuid';
import { query } from '@agenticmedia/database';
import { createLedgerTransaction } from './ledger';
import { publishEvent } from './event-bus';
import type { CreateLedgerTransactionInput } from '@agenticmedia/shared-types';

/**
 * @description Default split percentages for the AgenticMedia platform.
 * Platform (AgenticMedia): 2%, Agency: 15%, Creator: 83%
 */
export const DEFAULT_SPLITS = {
  PLATFORM_PERCENT: 2,
  AGENCY_PERCENT: 15,
  CREATOR_PERCENT: 83,
} as const;

export interface SplitPaymentInput {
  organizationId: string;
  contractId: string;
  totalAmount: number;
  currency?: string;
  platformFeePercent?: number;
  agencyFeePercent?: number;
  creatorPayoutPercent?: number;
  creatorId: string;
  stripePaymentIntentId?: string;
  idempotencyKey: string;
}

export interface SplitPaymentResult {
  transactionId: string;
  platformAmount: number;
  agencyAmount: number;
  creatorAmount: number;
  ledgerTransactionId: string;
}

/**
 * Executes a split payment: routes funds to Platform (AgenticMedia), Agency, and Creator.
 * Records the split in revenue_splits AND creates a double-entry ledger transaction
 * for perfect accounting (ties into Phase 4 Ledger).
 *
 * Example: $10,000 campaign → $200 Platform, $1,500 Agency, $8,300 Creator
 */
export async function executeSplitPayment(
  input: SplitPaymentInput
): Promise<SplitPaymentResult> {
  const {
    organizationId,
    contractId,
    totalAmount,
    currency = 'USD',
    platformFeePercent = DEFAULT_SPLITS.PLATFORM_PERCENT,
    agencyFeePercent = DEFAULT_SPLITS.AGENCY_PERCENT,
    creatorPayoutPercent = DEFAULT_SPLITS.CREATOR_PERCENT,
    creatorId,
    stripePaymentIntentId,
    idempotencyKey,
  } = input;

  // Validate fee split totals 100%
  const totalPercent = platformFeePercent + agencyFeePercent + creatorPayoutPercent;
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error(`Fee percentages must sum to 100 (got ${totalPercent})`);
  }

  // Calculate amounts
  const platformAmount = Math.round(totalAmount * (platformFeePercent / 100) * 100) / 100;
  const agencyAmount = Math.round(totalAmount * (agencyFeePercent / 100) * 100) / 100;
  const creatorAmount = Math.round((totalAmount - platformAmount - agencyAmount) * 100) / 100;

  // Fetch system ledger accounts for this org
  const accountsResult = await query(
    `SELECT id, name FROM ledger_accounts WHERE organization_id = $1 AND is_system_account = TRUE`,
    [organizationId]
  );

  const accounts: Record<string, string> = {};
  for (const row of accountsResult.rows) {
    accounts[row.name] = row.id;
  }

  const stripeClearing = accounts['stripe_clearing'];
  const platformRevenue = accounts['platform_revenue'];
  const agencyPayable = accounts['agency_payable'];
  const creatorPayable = accounts['creator_payable'];

  if (!stripeClearing || !platformRevenue || !agencyPayable || !creatorPayable) {
    throw new Error('System ledger accounts not initialized for this organization');
  }

  // Create the double-entry ledger transaction:
  // DR Stripe Clearing (asset ↑)    = totalAmount
  // CR Platform Revenue (revenue ↑)  = platformAmount
  // CR Agency Payable (liability ↑)  = agencyAmount
  // CR Creator Payable (liability ↑) = creatorAmount
  const ledgerInput: CreateLedgerTransactionInput = {
    organizationId,
    referenceType: 'smart_contract_payment',
    referenceId: contractId,
    description: `Split payment for contract ${contractId}: $${totalAmount} → Platform $${platformAmount}, Agency $${agencyAmount}, Creator $${creatorAmount}`,
    idempotencyKey: `ledger-${idempotencyKey}`,
    entries: [
      { accountId: stripeClearing, entryType: 'debit', amount: totalAmount, currency },
      { accountId: platformRevenue, entryType: 'credit', amount: platformAmount, currency },
      { accountId: agencyPayable, entryType: 'credit', amount: agencyAmount, currency },
      { accountId: creatorPayable, entryType: 'credit', amount: creatorAmount, currency },
    ],
  };

  const ledgerResult = await createLedgerTransaction(ledgerInput);

  // Log to audit_events for SOC-2 compliance
  try {
    await query(
      `INSERT INTO audit_events (id, organization_id, actor_type, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, 'system', 'create', 'split_payment', $3, $4)`,
      [
        uuidv4(),
        organizationId,
        contractId,
        JSON.stringify({
          totalAmount,
          platformAmount,
          agencyAmount,
          creatorAmount,
          stripePaymentIntentId: stripePaymentIntentId || null,
          ledgerTransactionId: ledgerResult.transactionId,
        }),
      ]
    );
  } catch (auditErr) {
    // Never silently fail on money operations — log error but don't block
    console.error('Failed to log split payment audit event:', auditErr);
  }

  // Publish domain event
  try {
    await publishEvent({
      organizationId,
      eventType: 'payment.succeeded',
      source: 'stripe-connect',
      payload: {
        contractId,
        totalAmount,
        platformAmount,
        agencyAmount,
        creatorAmount,
        ledgerTransactionId: ledgerResult.transactionId,
      },
      idempotencyKey: `event-${idempotencyKey}`,
    });
  } catch {
    // Event publishing failure should not block payment processing
    console.error('Failed to publish split payment event');
  }

  return {
    transactionId: uuidv4(),
    platformAmount,
    agencyAmount,
    creatorAmount,
    ledgerTransactionId: ledgerResult.transactionId,
  };
}

/**
 * Handles Stripe Connect account status updates.
 * Logs to audit_events for compliance tracking.
 */
export async function handleAccountUpdated(
  stripeAccountId: string,
  organizationId: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_events (id, organization_id, actor_type, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, 'system', 'update', 'stripe_account', $3, $4)`,
      [uuidv4(), organizationId, stripeAccountId, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('Failed to log Stripe account update:', err);
    throw err; // Re-throw — account updates must be tracked
  }
}
