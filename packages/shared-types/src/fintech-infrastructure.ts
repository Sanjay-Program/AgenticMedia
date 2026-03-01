// Financial Infrastructure types — Embedded Banking, Financing, Insurance

/** Creator Embedded Banking */
export type BankAccountStatus = 'pending' | 'active' | 'suspended' | 'closed';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD';

export interface CreatorBankAccount {
  id: string;
  creatorId: string;
  organizationId: string;
  status: BankAccountStatus;
  currency: Currency;
  balance: number;
  pendingBalance: number;
  stripeFinancialAccountId: string | null;
  createdAt: string;
}

/** Revenue-Based Financing */
export type FinancingStatus = 'pending' | 'approved' | 'active' | 'repaying' | 'completed' | 'defaulted' | 'rejected';

export interface FinancingApplication {
  id: string;
  creatorId: string;
  organizationId: string;
  requestedAmount: number;
  approvedAmount: number | null;
  repaymentRate: number; // percentage of future earnings (e.g. 0.05 = 5%)
  predictedSixMonthRevenue: number;
  riskScore: number; // 0-100
  status: FinancingStatus;
  disbursedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

/** Creator Insurance Products */
export type InsuranceType =
  | 'brand_cancellation'
  | 'revenue_drop'
  | 'pr_crisis'
  | 'copyright_strike';

export type InsurancePolicyStatus = 'quoted' | 'active' | 'claimed' | 'expired' | 'cancelled';

export interface InsurancePolicy {
  id: string;
  creatorId: string;
  organizationId: string;
  type: InsuranceType;
  status: InsurancePolicyStatus;
  coverageAmount: number;
  premiumMonthly: number;
  deductible: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

/** Financing eligibility calculation */
export function calculateMaxFinancingAmount(
  predictedSixMonthRevenue: number,
  creditScore: number,
  existingDebt: number
): number {
  // Cap at 40% of predicted revenue minus existing obligations
  const maxRatio = creditScore >= 80 ? 0.40 : creditScore >= 60 ? 0.30 : 0.20;
  const available = predictedSixMonthRevenue * maxRatio - existingDebt;
  return Math.max(0, Math.round(available * 100) / 100);
}

/** Insurance premium calculation */
export function calculateInsurancePremium(
  coverageAmount: number,
  riskScore: number,
  type: InsuranceType
): number {
  const baseRateMap: Record<InsuranceType, number> = {
    brand_cancellation: 0.015,
    revenue_drop: 0.020,
    pr_crisis: 0.025,
    copyright_strike: 0.010,
  };
  const baseRate = baseRateMap[type];
  // Higher risk = higher premium (1x to 3x multiplier)
  const riskMultiplier = 1 + (riskScore / 50);
  const annualPremium = coverageAmount * baseRate * riskMultiplier;
  return Math.round((annualPremium / 12) * 100) / 100; // monthly
}
