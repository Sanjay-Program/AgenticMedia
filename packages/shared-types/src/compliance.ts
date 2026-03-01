// Enterprise V2: Compliance, Tax & Audit Export Types

export type ComplianceFramework = 'soc2' | 'iso27001' | 'gdpr' | 'ccpa' | 'hipaa';
export type TaxFormType = '1099-NEC' | 'W-8BEN' | 'W-9' | 'VAT-invoice' | 'GST-invoice';

export interface ComplianceStatus {
  organizationId: string;
  frameworks: ComplianceFrameworkStatus[];
  lastAuditDate: string | null;
  nextAuditDate: string | null;
  overallStatus: 'compliant' | 'partial' | 'non_compliant' | 'pending_review';
}

export interface ComplianceFrameworkStatus {
  framework: ComplianceFramework;
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  controls: ComplianceControl[];
  lastAssessedAt: string;
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'partial' | 'not_tested';
  evidence: string | null;
  testedAt: string | null;
}

export interface AuditExport {
  organizationId: string;
  exportType: 'full' | 'financial' | 'access' | 'data_processing';
  dateRange: { startDate: string; endDate: string };
  format: 'json' | 'csv' | 'pdf';
  generatedAt: string;
  downloadUrl: string;
  expiresAt: string;
}

export interface TaxDocument {
  id: string;
  organizationId: string;
  recipientId: string;
  recipientType: 'creator' | 'agency';
  formType: TaxFormType;
  taxYear: number;
  totalEarnings: number;
  currency: string;
  status: 'draft' | 'generated' | 'sent' | 'filed';
  generatedAt: string;
}

/**
 * Withholding tax rates by country for cross-border payments.
 * These are simplified reference rates — actual rates depend on tax treaties.
 */
export const WITHHOLDING_TAX_RATES: Record<string, number> = {
  US: 0,      // No withholding for domestic
  GB: 0.20,   // UK withholding
  DE: 0.25,   // Germany
  FR: 0.25,   // France
  IN: 0.10,   // India (lower treaty rate)
  CA: 0.15,   // Canada (treaty rate)
  AU: 0.15,   // Australia
  BR: 0.15,   // Brazil
  JP: 0.10,   // Japan (treaty rate)
  default: 0.30,  // Default international rate
};

export const VAT_RATES: Record<string, number> = {
  GB: 0.20,   // UK VAT
  DE: 0.19,   // Germany
  FR: 0.20,   // France
  IT: 0.22,   // Italy
  ES: 0.21,   // Spain
  NL: 0.21,   // Netherlands
  SE: 0.25,   // Sweden
  IN: 0.18,   // India GST
  AU: 0.10,   // Australia GST
  CA: 0.05,   // Canada GST (federal only)
  default: 0,
};
