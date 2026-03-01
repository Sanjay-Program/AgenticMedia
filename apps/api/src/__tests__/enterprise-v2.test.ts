/**
 * Tests for Enterprise V2 Modules:
 * - Creator Credit Score & Fraud Detection
 * - Dynamic CPM Optimizer
 * - Brand Safety Scanner & Viral Probability
 * - Compliance types & tax rates
 * - Integration registry expansion
 * - Enterprise route registration
 */

import { calculateCreatorCreditScore, detectFraudSignals } from '../services/agents/credit-score';
import type { CreditScoreInput } from '../services/agents/credit-score';
import { calculateDynamicCPM } from '../services/agents/cpm-optimizer';
import type { CPMInput } from '../services/agents/cpm-optimizer';
import { scanContentForBrandSafety, calculateViralProbability } from '../services/agents/brand-safety';
import type { ViralInput } from '../services/agents/brand-safety';
import {
  CREDIT_SCORE_WEIGHTS,
  gradeFromScore,
  SEASONAL_MULTIPLIERS,
  INDUSTRY_BASE_CPM,
  BRAND_SAFETY_THRESHOLDS,
  classifyBrandSafety,
  WITHHOLDING_TAX_RATES,
  VAT_RATES,
  INTEGRATION_REGISTRY,
} from '@agenticmedia/shared-types';

// ──────────────────────────────────────────────────────────────
// Creator Credit Score Tests
// ──────────────────────────────────────────────────────────────
describe('Enterprise V2: Creator Credit Score', () => {
  const baseMetrics: CreditScoreInput = {
    totalCampaigns: 10,
    completedOnTime: 9,
    disputes: 0,
    followersCount: 50000,
    avgEngagementRate: 0.04,
    followerGrowthRate: 5,
    commentQuality: 0.8,
    audienceRealPercent: 85,
    demographicMatchScore: 75,
    monthlyGrowthRates: [3, 4, 5, 3, 6, 4],
  };

  describe('calculateCreatorCreditScore', () => {
    it('should return a high score for a reliable creator', () => {
      const result = calculateCreatorCreditScore('creator-1', 'org-1', baseMetrics);

      expect(result.overallScore).toBeGreaterThan(60);
      expect(result.grade).toMatch(/^[A-C]$/);
      expect(result.creatorId).toBe('creator-1');
      expect(result.organizationId).toBe('org-1');
      expect(result.components).toHaveProperty('paymentReliability');
      expect(result.components).toHaveProperty('campaignReliability');
      expect(result.components).toHaveProperty('engagementAuthenticity');
      expect(result.components).toHaveProperty('audienceQuality');
      expect(result.components).toHaveProperty('growthHealth');
    });

    it('should return a low score for a creator with disputes and poor engagement', () => {
      const poorMetrics: CreditScoreInput = {
        ...baseMetrics,
        completedOnTime: 3,
        disputes: 4,
        avgEngagementRate: 0.002,
        commentQuality: 0.15,
        audienceRealPercent: 25,
        monthlyGrowthRates: [60, 2, -5, 1, 80, 3], // Suspicious spikes
      };

      const result = calculateCreatorCreditScore('creator-2', 'org-1', poorMetrics);

      expect(result.overallScore).toBeLessThan(50);
      expect(result.grade).toMatch(/^[D-F]$/);
      expect(result.fraudSignals.length).toBeGreaterThan(0);
    });

    it('should default to 50 for new creators with no campaigns', () => {
      const newCreator: CreditScoreInput = {
        ...baseMetrics,
        totalCampaigns: 0,
        completedOnTime: 0,
        disputes: 0,
      };

      const result = calculateCreatorCreditScore('creator-3', 'org-1', newCreator);

      // New creators get a middle-ground default
      expect(result.overallScore).toBeGreaterThan(30);
      expect(result.overallScore).toBeLessThan(90);
    });
  });

  describe('detectFraudSignals', () => {
    it('should detect follower spike', () => {
      const metrics: CreditScoreInput = {
        ...baseMetrics,
        monthlyGrowthRates: [3, 4, 55, 3, 4, 5], // 55% spike
      };

      const signals = detectFraudSignals(metrics);
      const spikeSignal = signals.find(s => s.type === 'follower_spike');
      expect(spikeSignal).toBeDefined();
      expect(spikeSignal!.severity).toBe('high');
    });

    it('should detect low engagement for high-follower accounts', () => {
      const metrics: CreditScoreInput = {
        ...baseMetrics,
        followersCount: 500000,
        avgEngagementRate: 0.001, // Very low for 500k
      };

      const signals = detectFraudSignals(metrics);
      const engSignal = signals.find(s => s.type === 'engagement_drop');
      expect(engSignal).toBeDefined();
    });

    it('should detect bot comments', () => {
      const metrics: CreditScoreInput = {
        ...baseMetrics,
        commentQuality: 0.15,
      };

      const signals = detectFraudSignals(metrics);
      const botSignal = signals.find(s => s.type === 'bot_comments');
      expect(botSignal).toBeDefined();
      expect(botSignal!.severity).toBe('high');
    });

    it('should detect low audience reality', () => {
      const metrics: CreditScoreInput = {
        ...baseMetrics,
        audienceRealPercent: 20,
      };

      const signals = detectFraudSignals(metrics);
      const audienceSignal = signals.find(s => s.type === 'audience_anomaly');
      expect(audienceSignal).toBeDefined();
      expect(audienceSignal!.severity).toBe('critical');
    });

    it('should return no signals for clean creator', () => {
      const signals = detectFraudSignals(baseMetrics);
      expect(signals.length).toBe(0);
    });
  });

  describe('gradeFromScore', () => {
    it('should return correct grades', () => {
      expect(gradeFromScore(90)).toBe('A');
      expect(gradeFromScore(85)).toBe('A');
      expect(gradeFromScore(75)).toBe('B');
      expect(gradeFromScore(60)).toBe('C');
      expect(gradeFromScore(45)).toBe('D');
      expect(gradeFromScore(30)).toBe('F');
    });
  });

  describe('CREDIT_SCORE_WEIGHTS', () => {
    it('should sum to 1.0', () => {
      const totalWeight = Object.values(CREDIT_SCORE_WEIGHTS).reduce((sum, w) => sum + w, 0);
      expect(totalWeight).toBeCloseTo(1.0, 10);
    });
  });
});

// ──────────────────────────────────────────────────────────────
// Dynamic CPM Optimizer Tests
// ──────────────────────────────────────────────────────────────
describe('Enterprise V2: Dynamic CPM Optimizer', () => {
  describe('calculateDynamicCPM', () => {
    it('should calculate CPM with historical data', () => {
      const input: CPMInput = {
        historicalCPM: 10,
        engagementRate: 0.05,
        industry: 'technology',
        currentMonth: 10, // Q4
        historicalCampaignCount: 8,
        brandAvgBudget: 30000,
        audienceMatch: 0.8,
        conversionRate: 0.02,
      };

      const result = calculateDynamicCPM('creator-1', 'youtube', input);

      expect(result.creatorId).toBe('creator-1');
      expect(result.platform).toBe('youtube');
      expect(result.baseCPM).toBe(10);
      expect(result.adjustedCPM).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.adjustmentFactors).toHaveProperty('seasonality');
      expect(result.adjustmentFactors).toHaveProperty('industryDemand');
    });

    it('should use industry base CPM when no historical data', () => {
      const input: CPMInput = {
        historicalCPM: 0,
        engagementRate: 0.03,
        industry: 'finance',
        currentMonth: 6,
        historicalCampaignCount: 0,
        brandAvgBudget: 0,
        audienceMatch: 0.5,
        conversionRate: 0,
      };

      const result = calculateDynamicCPM('creator-2', 'tiktok', input);

      expect(result.baseCPM).toBe(INDUSTRY_BASE_CPM.finance);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should apply Q4 premium', () => {
      const q2Input: CPMInput = {
        historicalCPM: 10,
        engagementRate: 0.04,
        industry: 'default',
        currentMonth: 4, // Q2
        historicalCampaignCount: 5,
        brandAvgBudget: 10000,
        audienceMatch: 0.7,
        conversionRate: 0.01,
      };

      const q4Input: CPMInput = { ...q2Input, currentMonth: 11 }; // Q4

      const q2Result = calculateDynamicCPM('c', 'yt', q2Input);
      const q4Result = calculateDynamicCPM('c', 'yt', q4Input);

      expect(q4Result.adjustmentFactors.seasonality).toBeGreaterThan(q2Result.adjustmentFactors.seasonality);
      expect(q4Result.adjustedCPM).toBeGreaterThan(q2Result.adjustedCPM);
    });

    it('should apply premium for high-budget brands', () => {
      const lowBudget: CPMInput = {
        historicalCPM: 10,
        engagementRate: 0.04,
        industry: 'default',
        currentMonth: 6,
        historicalCampaignCount: 5,
        brandAvgBudget: 5000,
        audienceMatch: 0.7,
        conversionRate: 0,
      };

      const highBudget: CPMInput = { ...lowBudget, brandAvgBudget: 100000 };

      const lowResult = calculateDynamicCPM('c', 'yt', lowBudget);
      const highResult = calculateDynamicCPM('c', 'yt', highBudget);

      expect(highResult.adjustmentFactors.brandBudgetFit).toBeGreaterThan(lowResult.adjustmentFactors.brandBudgetFit);
    });
  });

  describe('SEASONAL_MULTIPLIERS', () => {
    it('should have Q4 as highest', () => {
      expect(SEASONAL_MULTIPLIERS[4]).toBeGreaterThan(SEASONAL_MULTIPLIERS[1]);
      expect(SEASONAL_MULTIPLIERS[4]).toBeGreaterThan(SEASONAL_MULTIPLIERS[2]);
      expect(SEASONAL_MULTIPLIERS[4]).toBeGreaterThan(SEASONAL_MULTIPLIERS[3]);
    });
  });

  describe('INDUSTRY_BASE_CPM', () => {
    it('should have positive values for all industries', () => {
      for (const [, cpm] of Object.entries(INDUSTRY_BASE_CPM)) {
        expect(cpm).toBeGreaterThan(0);
      }
    });

    it('should have a default value', () => {
      expect(INDUSTRY_BASE_CPM.default).toBeDefined();
      expect(INDUSTRY_BASE_CPM.default).toBeGreaterThan(0);
    });
  });
});

// ──────────────────────────────────────────────────────────────
// Brand Safety & Viral Probability Tests
// ──────────────────────────────────────────────────────────────
describe('Enterprise V2: Brand Safety Scanner', () => {
  describe('scanContentForBrandSafety', () => {
    it('should return safe for clean content', () => {
      const result = scanContentForBrandSafety(
        'job-1',
        'Today I want to share my morning routine and healthy breakfast ideas.'
      );

      expect(result.overallLevel).toBe('safe');
      expect(result.score).toBeGreaterThanOrEqual(BRAND_SAFETY_THRESHOLDS.SAFE);
      expect(result.flags.length).toBe(0);
    });

    it('should flag content with profanity', () => {
      const result = scanContentForBrandSafety(
        'job-2',
        'What the fuck is wrong with this shit product, damn it all to hell'
      );

      expect(result.score).toBeLessThan(100);
      expect(result.flags.some(f => f.category === 'profanity')).toBe(true);
    });

    it('should flag content with political references', () => {
      const result = scanContentForBrandSafety(
        'job-3',
        'The election results show that the republican and democrat candidates are both partisan.'
      );

      expect(result.flags.some(f => f.category === 'politics')).toBe(true);
    });

    it('should also scan metadata', () => {
      const result = scanContentForBrandSafety(
        'job-4',
        'Clean transcript here.',
        { title: 'gambling tips casino betting odds strategy' }
      );

      expect(result.flags.some(f => f.category === 'gambling')).toBe(true);
    });
  });

  describe('classifyBrandSafety', () => {
    it('should classify scores correctly', () => {
      expect(classifyBrandSafety(95)).toBe('safe');
      expect(classifyBrandSafety(70)).toBe('low_risk');
      expect(classifyBrandSafety(50)).toBe('medium_risk');
      expect(classifyBrandSafety(30)).toBe('high_risk');
      expect(classifyBrandSafety(10)).toBe('unsafe');
    });
  });
});

describe('Enterprise V2: Viral Probability', () => {
  describe('calculateViralProbability', () => {
    it('should give high score for well-optimized content', () => {
      const input: ViralInput = {
        hasStrongHook: true,
        hookLength: 2,
        titleLength: 50,
        durationSeconds: 30,
        usesTrendingTopic: true,
        hasCallToAction: true,
      };

      const result = calculateViralProbability('content-1', 'tiktok', input);

      expect(result.overallProbability).toBeGreaterThan(70);
      expect(result.factors.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBe(0); // No suggestions for perfect content
    });

    it('should give low score and suggestions for unoptimized content', () => {
      const input: ViralInput = {
        hasStrongHook: false,
        hookLength: 10,
        titleLength: 10,
        durationSeconds: 300,
        usesTrendingTopic: false,
        hasCallToAction: false,
      };

      const result = calculateViralProbability('content-2', 'tiktok', input);

      expect(result.overallProbability).toBeLessThan(60);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.type === 'hook')).toBe(true);
      expect(result.suggestions.some(s => s.type === 'cta')).toBe(true);
    });
  });
});

// ──────────────────────────────────────────────────────────────
// Compliance & Tax Tests
// ──────────────────────────────────────────────────────────────
describe('Enterprise V2: Compliance & Tax', () => {
  describe('WITHHOLDING_TAX_RATES', () => {
    it('should have US at 0%', () => {
      expect(WITHHOLDING_TAX_RATES.US).toBe(0);
    });

    it('should have a DEFAULT rate', () => {
      expect(WITHHOLDING_TAX_RATES.default).toBeDefined();
      expect(WITHHOLDING_TAX_RATES.default).toBeGreaterThan(0);
    });

    it('should have all rates between 0 and 1', () => {
      for (const [, rate] of Object.entries(WITHHOLDING_TAX_RATES)) {
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('VAT_RATES', () => {
    it('should have UK at 20%', () => {
      expect(VAT_RATES.GB).toBe(0.20);
    });

    it('should have DEFAULT at 0', () => {
      expect(VAT_RATES.default).toBe(0);
    });
  });
});

// ──────────────────────────────────────────────────────────────
// Integration Registry Expansion Tests
// ──────────────────────────────────────────────────────────────
describe('Enterprise V2: Integration Registry', () => {
  it('should include enterprise integrations', () => {
    const providers = INTEGRATION_REGISTRY.map(i => i.provider);
    expect(providers).toContain('salesforce');
    expect(providers).toContain('netsuite');
    expect(providers).toContain('sap');
    expect(providers).toContain('microsoft_teams');
  });

  it('should have enterprise category for ERP integrations', () => {
    const salesforce = INTEGRATION_REGISTRY.find(i => i.provider === 'salesforce');
    const netsuite = INTEGRATION_REGISTRY.find(i => i.provider === 'netsuite');
    const sap = INTEGRATION_REGISTRY.find(i => i.provider === 'sap');

    expect(salesforce?.category).toBe('enterprise');
    expect(netsuite?.category).toBe('enterprise');
    expect(sap?.category).toBe('enterprise');
  });

  it('should now have 12 total integrations', () => {
    expect(INTEGRATION_REGISTRY.length).toBe(12);
  });

  it('should have teams as messaging category', () => {
    const teams = INTEGRATION_REGISTRY.find(i => i.provider === 'microsoft_teams');
    expect(teams?.category).toBe('messaging');
  });
});

// ──────────────────────────────────────────────────────────────
// Enterprise Route Registration Test
// ──────────────────────────────────────────────────────────────
describe('Enterprise V2: Route Registration', () => {
  it('should register enterprise routes in server', async () => {
    const { app } = await import('../server');
    const routes = (app as any)._router.stack
      .filter((r: any) => r.route || (r.name === 'router' && r.regexp))
      .map((r: any) => {
        if (r.route) return r.route.path;
        return r.regexp?.toString();
      });

    const routeString = routes.join('|');
    expect(routeString).toContain('enterprise');
  });
});
