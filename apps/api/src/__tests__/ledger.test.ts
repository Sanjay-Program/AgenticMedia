// Test double-entry ledger validation logic
import type { CreateLedgerTransactionInput } from '@agenticmedia/shared-types';

// Extract the pure validation logic from the ledger service for unit testing
function validateLedgerEntries(entries: CreateLedgerTransactionInput['entries']): {
  valid: boolean;
  totalDebits: number;
  totalCredits: number;
  error?: string;
} {
  let totalDebits = 0;
  let totalCredits = 0;

  for (const entry of entries) {
    if (entry.amount <= 0) {
      return { valid: false, totalDebits, totalCredits, error: 'Ledger entry amounts must be positive' };
    }
    if (entry.entryType === 'debit') {
      totalDebits += entry.amount;
    } else {
      totalCredits += entry.amount;
    }
  }

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    return {
      valid: false,
      totalDebits,
      totalCredits,
      error: `Debits ($${totalDebits.toFixed(2)}) must equal credits ($${totalCredits.toFixed(2)})`,
    };
  }

  return { valid: true, totalDebits, totalCredits };
}

describe('Double-Entry Ledger Validation', () => {
  it('should validate balanced debits and credits', () => {
    const result = validateLedgerEntries([
      { accountId: 'acc-1', entryType: 'debit', amount: 100 },
      { accountId: 'acc-2', entryType: 'credit', amount: 100 },
    ]);
    expect(result.valid).toBe(true);
    expect(result.totalDebits).toBe(100);
    expect(result.totalCredits).toBe(100);
  });

  it('should reject unbalanced entries', () => {
    const result = validateLedgerEntries([
      { accountId: 'acc-1', entryType: 'debit', amount: 100 },
      { accountId: 'acc-2', entryType: 'credit', amount: 50 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Debits');
  });

  it('should reject negative amounts', () => {
    const result = validateLedgerEntries([
      { accountId: 'acc-1', entryType: 'debit', amount: -50 },
      { accountId: 'acc-2', entryType: 'credit', amount: -50 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Ledger entry amounts must be positive');
  });

  it('should reject zero amounts', () => {
    const result = validateLedgerEntries([
      { accountId: 'acc-1', entryType: 'debit', amount: 0 },
      { accountId: 'acc-2', entryType: 'credit', amount: 0 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Ledger entry amounts must be positive');
  });

  it('should handle multi-party splits correctly (platform 5%, agency 15%, creator 80%)', () => {
    const total = 10000;
    const platformFee = total * 0.05;
    const agencyFee = total * 0.15;
    const creatorPayout = total * 0.80;

    const result = validateLedgerEntries([
      // Debit cash received
      { accountId: 'cash', entryType: 'debit', amount: total },
      // Credit the splits
      { accountId: 'platform-revenue', entryType: 'credit', amount: platformFee },
      { accountId: 'agency-payable', entryType: 'credit', amount: agencyFee },
      { accountId: 'creator-payable', entryType: 'credit', amount: creatorPayout },
    ]);

    expect(result.valid).toBe(true);
    expect(result.totalDebits).toBe(10000);
    expect(result.totalCredits).toBe(10000);
  });

  it('should handle floating point precision correctly', () => {
    // 33.33 + 33.33 + 33.34 = 100.00
    const result = validateLedgerEntries([
      { accountId: 'acc-1', entryType: 'debit', amount: 100 },
      { accountId: 'acc-2', entryType: 'credit', amount: 33.33 },
      { accountId: 'acc-3', entryType: 'credit', amount: 33.33 },
      { accountId: 'acc-4', entryType: 'credit', amount: 33.34 },
    ]);
    expect(result.valid).toBe(true);
  });

  it('should validate a complex real-world campaign payout', () => {
    const campaignValue = 50000;
    const platformCut = campaignValue * 0.02; // 1000
    const agencyCut = campaignValue * 0.15;   // 7500
    const creatorCut = campaignValue * 0.83;  // 41500

    const result = validateLedgerEntries([
      { accountId: 'stripe-clearing', entryType: 'debit', amount: campaignValue },
      { accountId: 'platform-revenue', entryType: 'credit', amount: platformCut },
      { accountId: 'agency-payable', entryType: 'credit', amount: agencyCut },
      { accountId: 'creator-payable', entryType: 'credit', amount: creatorCut },
    ]);

    expect(result.valid).toBe(true);
    expect(result.totalDebits).toBe(50000);
    expect(result.totalCredits).toBe(50000);
  });
});
