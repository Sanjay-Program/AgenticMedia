export type CampaignDealStatus = 'negotiating' | 'active' | 'completed' | 'cancelled';
export type ContractStatus = 'draft' | 'pending_signatures' | 'active' | 'completed' | 'disputed';
export type SplitRecipientType = 'platform' | 'agency' | 'creator';
export type SplitStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';

export interface Campaign {
  id: string;
  organizationId: string;
  creatorId: string;
  brandContactId: string | null;
  name: string;
  description: string | null;
  status: CampaignDealStatus;
  totalValue: number;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SmartContract {
  id: string;
  campaignId: string;
  status: ContractStatus;
  terms: Record<string, unknown>;
  platformFeePercent: number;
  agencyFeePercent: number;
  creatorPayoutPercent: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueSplit {
  id: string;
  smartContractId: string;
  recipientType: SplitRecipientType;
  recipientId: string;
  amount: number;
  currency: string;
  stripeTransferId: string | null;
  status: SplitStatus;
  processedAt: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  smartContractId: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidByBrandContactId: string | null;
  createdAt: string;
  updatedAt: string;
}
