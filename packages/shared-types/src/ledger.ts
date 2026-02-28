// Phase 4: Double-Entry Accounting Ledger Types

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type LedgerEntryType = 'debit' | 'credit';
export type FinancialTxStatus = 'pending' | 'posted' | 'reversed' | 'failed';

export interface LedgerAccount {
  id: string;
  organizationId: string;
  name: string;
  accountType: AccountType;
  currency: string;
  balance: number;
  isSystemAccount: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialTransaction {
  id: string;
  organizationId: string;
  referenceType: string;
  referenceId: string | null;
  description: string;
  status: FinancialTxStatus;
  idempotencyKey: string;
  postedAt: string | null;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  entryType: LedgerEntryType;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface CreateLedgerTransactionInput {
  organizationId: string;
  referenceType: string;
  referenceId?: string;
  description: string;
  idempotencyKey: string;
  entries: Array<{
    accountId: string;
    entryType: LedgerEntryType;
    amount: number;
    currency?: string;
  }>;
}

// Pre-defined system account names
export const SYSTEM_ACCOUNTS = {
  PLATFORM_REVENUE: 'platform_revenue',
  AGENCY_PAYABLE: 'agency_payable',
  CREATOR_PAYABLE: 'creator_payable',
  CASH_RECEIVED: 'cash_received',
  ACCOUNTS_RECEIVABLE: 'accounts_receivable',
  STRIPE_CLEARING: 'stripe_clearing',
} as const;

export type SystemAccountName = typeof SYSTEM_ACCOUNTS[keyof typeof SYSTEM_ACCOUNTS];
