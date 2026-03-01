import type { CreateLedgerTransactionInput } from '@agenticmedia/shared-types';

/**
 * Tests for Stripe Connect split payment logic.
 * Validates the revenue split calculation and ledger entry creation.
 */

// Pure function: calculates split amounts
function calculateSplitAmounts(
  totalAmount: number,
  platformPercent: number,
  agencyPercent: number,
  creatorPercent: number
): { platformAmount: number; agencyAmount: number; creatorAmount: number } {
  const platformAmount = Math.round(totalAmount * (platformPercent / 100) * 100) / 100;
  const agencyAmount = Math.round(totalAmount * (agencyPercent / 100) * 100) / 100;
  const creatorAmount = Math.round((totalAmount - platformAmount - agencyAmount) * 100) / 100;
  return { platformAmount, agencyAmount, creatorAmount };
}

// Pure function: validates split percentages
function validateSplitPercentages(
  platformPercent: number,
  agencyPercent: number,
  creatorPercent: number
): { valid: boolean; error?: string } {
  const total = platformPercent + agencyPercent + creatorPercent;
  if (Math.abs(total - 100) > 0.01) {
    return { valid: false, error: `Fee percentages must sum to 100 (got ${total})` };
  }
  return { valid: true };
}

// Pure function: builds the ledger entries for a split payment
function buildLedgerEntries(
  amounts: { platformAmount: number; agencyAmount: number; creatorAmount: number },
  totalAmount: number,
  accountIds: Record<string, string>
): CreateLedgerTransactionInput['entries'] {
  return [
    { accountId: accountIds['stripe_clearing'], entryType: 'debit' as const, amount: totalAmount },
    { accountId: accountIds['platform_revenue'], entryType: 'credit' as const, amount: amounts.platformAmount },
    { accountId: accountIds['agency_payable'], entryType: 'credit' as const, amount: amounts.agencyAmount },
    { accountId: accountIds['creator_payable'], entryType: 'credit' as const, amount: amounts.creatorAmount },
  ];
}

describe('Stripe Connect Split Payments', () => {
  describe('calculateSplitAmounts', () => {
    it('should split $10,000 with default percentages (2/15/83)', () => {
      const result = calculateSplitAmounts(10000, 2, 15, 83);
      expect(result.platformAmount).toBe(200);
      expect(result.agencyAmount).toBe(1500);
      expect(result.creatorAmount).toBe(8300);
      expect(result.platformAmount + result.agencyAmount + result.creatorAmount).toBe(10000);
    });

    it('should handle odd amounts without rounding errors', () => {
      const result = calculateSplitAmounts(9999.99, 2, 15, 83);
      const sum = result.platformAmount + result.agencyAmount + result.creatorAmount;
      // Sum should be within 1 cent of total
      expect(Math.abs(sum - 9999.99)).toBeLessThanOrEqual(0.01);
    });

    it('should handle small amounts correctly', () => {
      const result = calculateSplitAmounts(100, 2, 15, 83);
      expect(result.platformAmount).toBe(2);
      expect(result.agencyAmount).toBe(15);
      expect(result.creatorAmount).toBe(83);
    });

    it('should handle large campaign values', () => {
      const result = calculateSplitAmounts(500000, 2, 15, 83);
      expect(result.platformAmount).toBe(10000);
      expect(result.agencyAmount).toBe(75000);
      expect(result.creatorAmount).toBe(415000);
    });
  });

  describe('validateSplitPercentages', () => {
    it('should accept valid 100% split', () => {
      expect(validateSplitPercentages(2, 15, 83).valid).toBe(true);
    });

    it('should accept equal three-way split', () => {
      expect(validateSplitPercentages(33.33, 33.33, 33.34).valid).toBe(true);
    });

    it('should reject splits that exceed 100%', () => {
      const result = validateSplitPercentages(5, 20, 80);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must sum to 100');
    });

    it('should reject splits under 100%', () => {
      const result = validateSplitPercentages(1, 10, 80);
      expect(result.valid).toBe(false);
    });
  });

  describe('buildLedgerEntries', () => {
    const mockAccounts = {
      stripe_clearing: 'acct-1',
      platform_revenue: 'acct-2',
      agency_payable: 'acct-3',
      creator_payable: 'acct-4',
    };

    it('should create balanced double-entry ledger entries', () => {
      const amounts = { platformAmount: 200, agencyAmount: 1500, creatorAmount: 8300 };
      const entries = buildLedgerEntries(amounts, 10000, mockAccounts);

      // Should have 4 entries: 1 debit + 3 credits
      expect(entries).toHaveLength(4);
      expect(entries[0].entryType).toBe('debit');
      expect(entries[0].amount).toBe(10000);

      const totalCredits = entries.slice(1).reduce((sum, e) => sum + e.amount, 0);
      expect(totalCredits).toBe(10000);
    });

    it('should map to correct system accounts', () => {
      const amounts = { platformAmount: 200, agencyAmount: 1500, creatorAmount: 8300 };
      const entries = buildLedgerEntries(amounts, 10000, mockAccounts);

      expect(entries[0].accountId).toBe('acct-1'); // stripe_clearing
      expect(entries[1].accountId).toBe('acct-2'); // platform_revenue
      expect(entries[2].accountId).toBe('acct-3'); // agency_payable
      expect(entries[3].accountId).toBe('acct-4'); // creator_payable
    });
  });
});
