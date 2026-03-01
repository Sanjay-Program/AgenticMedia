/**
 * Enterprise V3 Tests — Creator Intelligence, Fintech Infrastructure,
 * Content AI, War Room
 */
import {
  // Creator Intelligence
  classifyRiskLevel,
  classifyGrowthTrajectory,
  // Fintech Infrastructure
  calculateMaxFinancingAmount,
  calculateInsurancePremium,
  // Content AI
  predictHookRetention,
  predictThumbnailCTR,
  // War Room
  classifyRiskColor,
  calculatePortfolioHealth,
} from '@agenticmedia/shared-types';
import type { PortfolioCreator, InsuranceType } from '@agenticmedia/shared-types';
import { assessCreatorRisk } from '../services/agents/creator-risk';
import { predictCreatorLTV } from '../services/agents/ltv-predictor';
import { generateViralHooks, scoreThumbnailVariant, selectBestThumbnail, generateScriptOutline } from '../services/agents/content-ai';

// ════════════════════════════════════════════════════════════════
// 1. Creator Intelligence Superlayer
// ════════════════════════════════════════════════════════════════

describe('Creator Intelligence', () => {
  describe('classifyRiskLevel', () => {
    it('should classify minimal risk (0-15)', () => {
      expect(classifyRiskLevel(0)).toBe('minimal');
      expect(classifyRiskLevel(15)).toBe('minimal');
    });

    it('should classify low risk (16-35)', () => {
      expect(classifyRiskLevel(20)).toBe('low');
      expect(classifyRiskLevel(35)).toBe('low');
    });

    it('should classify moderate risk (36-55)', () => {
      expect(classifyRiskLevel(45)).toBe('moderate');
    });

    it('should classify high risk (56-75)', () => {
      expect(classifyRiskLevel(70)).toBe('high');
    });

    it('should classify critical risk (76-100)', () => {
      expect(classifyRiskLevel(90)).toBe('critical');
      expect(classifyRiskLevel(100)).toBe('critical');
    });
  });

  describe('classifyGrowthTrajectory', () => {
    it('should classify declining growth', () => {
      expect(classifyGrowthTrajectory(-0.05)).toBe('declining');
    });

    it('should classify stagnant growth', () => {
      expect(classifyGrowthTrajectory(0.01)).toBe('stagnant');
    });

    it('should classify growing', () => {
      expect(classifyGrowthTrajectory(0.05)).toBe('growing');
    });

    it('should classify accelerating growth', () => {
      expect(classifyGrowthTrajectory(0.15)).toBe('accelerating');
    });

    it('should classify explosive growth', () => {
      expect(classifyGrowthTrajectory(0.30)).toBe('explosive');
    });
  });

  describe('assessCreatorRisk', () => {
    it('should return low risk for clean creator', () => {
      const result = assessCreatorRisk({
        creatorId: 'creator-1',
        organizationId: 'org-1',
        controversyMentions: 0,
        politicalContentRatio: 0,
        sentimentVolatility: 0.1,
        copyrightStrikes: 0,
        communityStrikes: 0,
        negativeCommentRatio: 0.05,
        audienceToxicitySignals: 0,
        followerCount: 100000,
        recentUnfollowSpike: false,
      });

      expect(result.overallRiskScore).toBeLessThan(30);
      expect(result.riskLevel).toMatch(/minimal|low/);
      expect(result.cancelProbability).toBeLessThan(0.3);
    });

    it('should return high risk for controversial creator', () => {
      const result = assessCreatorRisk({
        creatorId: 'creator-2',
        organizationId: 'org-1',
        controversyMentions: 15,
        politicalContentRatio: 0.6,
        sentimentVolatility: 0.8,
        copyrightStrikes: 2,
        communityStrikes: 1,
        negativeCommentRatio: 0.4,
        audienceToxicitySignals: 20,
        followerCount: 500000,
        recentUnfollowSpike: true,
      });

      expect(result.overallRiskScore).toBeGreaterThan(40);
      expect(result.signals.length).toBeGreaterThan(0);
      expect(result.cancelProbability).toBeGreaterThan(0.2);
    });

    it('should include signal details', () => {
      const result = assessCreatorRisk({
        creatorId: 'creator-3',
        organizationId: 'org-1',
        controversyMentions: 5,
        politicalContentRatio: 0.3,
        sentimentVolatility: 0.5,
        copyrightStrikes: 3,
        communityStrikes: 0,
        negativeCommentRatio: 0.2,
        audienceToxicitySignals: 5,
        followerCount: 200000,
        recentUnfollowSpike: false,
      });

      const categories = result.signals.map(s => s.category);
      expect(categories).toContain('copyright_strikes');
    });
  });

  describe('predictCreatorLTV', () => {
    it('should predict LTV for growing creator', () => {
      const result = predictCreatorLTV({
        creatorId: 'creator-1',
        organizationId: 'org-1',
        monthlyRevenues: [5000, 6000, 7000, 8000, 9000, 10000],
        followerGrowthRate: 0.08,
        engagementRate: 0.04,
        platformCount: 3,
        avgCampaignValue: 3000,
        campaignsPerMonth: 2,
        contentFrequency: 5,
        monthsActive: 12,
      });

      expect(result.sixMonthRevenue).toBeGreaterThan(0);
      expect(result.twelveMonthRevenue).toBeGreaterThan(result.sixMonthRevenue);
      expect(result.growthTrajectory).not.toBe('declining');
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });

    it('should detect burnout risk for overworked creator', () => {
      const result = predictCreatorLTV({
        creatorId: 'creator-2',
        organizationId: 'org-1',
        monthlyRevenues: [10000, 9500, 9000, 8500, 8000, 7500],
        followerGrowthRate: -0.01,
        engagementRate: 0.01,
        platformCount: 1,
        avgCampaignValue: 2000,
        campaignsPerMonth: 1,
        contentFrequency: 10,
        monthsActive: 24,
      });

      expect(result.burnoutRiskScore).toBeGreaterThan(0);
      expect(result.growthTrajectory).toBe('declining');
    });

    it('should handle creator with no revenue history', () => {
      const result = predictCreatorLTV({
        creatorId: 'creator-3',
        organizationId: 'org-1',
        monthlyRevenues: [],
        followerGrowthRate: 0.15,
        engagementRate: 0.06,
        platformCount: 2,
        avgCampaignValue: 0,
        campaignsPerMonth: 0,
        contentFrequency: 3,
        monthsActive: 2,
      });

      expect(result.sixMonthRevenue).toBe(0);
      expect(result.confidenceScore).toBeLessThan(0.5);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// 2. Fintech Infrastructure
// ════════════════════════════════════════════════════════════════

describe('Fintech Infrastructure', () => {
  describe('calculateMaxFinancingAmount', () => {
    it('should calculate max for high credit creator', () => {
      const max = calculateMaxFinancingAmount(120000, 85, 0);
      expect(max).toBe(48000); // 40% of 120K
    });

    it('should calculate max for medium credit creator', () => {
      const max = calculateMaxFinancingAmount(120000, 65, 0);
      expect(max).toBe(36000); // 30% of 120K
    });

    it('should calculate max for low credit creator', () => {
      const max = calculateMaxFinancingAmount(120000, 50, 0);
      expect(max).toBe(24000); // 20% of 120K
    });

    it('should subtract existing debt', () => {
      const max = calculateMaxFinancingAmount(120000, 85, 20000);
      expect(max).toBe(28000); // 48K - 20K
    });

    it('should not go below zero', () => {
      const max = calculateMaxFinancingAmount(10000, 50, 50000);
      expect(max).toBe(0);
    });
  });

  describe('calculateInsurancePremium', () => {
    it('should calculate monthly premium for brand cancellation', () => {
      const premium = calculateInsurancePremium(100000, 30, 'brand_cancellation');
      expect(premium).toBeGreaterThan(0);
      expect(premium).toBeLessThan(1000); // reasonable monthly range
    });

    it('should increase premium with higher risk', () => {
      const lowRisk = calculateInsurancePremium(100000, 20, 'pr_crisis');
      const highRisk = calculateInsurancePremium(100000, 80, 'pr_crisis');
      expect(highRisk).toBeGreaterThan(lowRisk);
    });

    it('should scale with coverage amount', () => {
      const small = calculateInsurancePremium(10000, 50, 'revenue_drop');
      const large = calculateInsurancePremium(100000, 50, 'revenue_drop');
      expect(large).toBeGreaterThan(small);
    });

    it('should handle all insurance types', () => {
      const types: InsuranceType[] = ['brand_cancellation', 'revenue_drop', 'pr_crisis', 'copyright_strike'];
      types.forEach(type => {
        const premium = calculateInsurancePremium(50000, 40, type);
        expect(premium).toBeGreaterThan(0);
      });
    });
  });
});

// ════════════════════════════════════════════════════════════════
// 3. Content AI Production
// ════════════════════════════════════════════════════════════════

describe('Content AI', () => {
  describe('predictHookRetention', () => {
    it('should score question hooks higher', () => {
      const question = predictHookRetention('Why is nobody talking about this?');
      const statement = predictHookRetention('This is a normal statement about things');
      expect(question).toBeGreaterThan(statement);
    });

    it('should score hooks with numbers higher', () => {
      const withNumber = predictHookRetention('5 mistakes you make daily');
      const without = predictHookRetention('Mistakes you make daily');
      expect(withNumber).toBeGreaterThan(without);
    });

    it('should cap at 0.95', () => {
      const extreme = predictHookRetention('Why is nobody talking about these 10 secret shocking truth?');
      expect(extreme).toBeLessThanOrEqual(0.95);
    });

    it('should have a baseline above 0.2', () => {
      const minimal = predictHookRetention('hello');
      expect(minimal).toBeGreaterThan(0.2);
    });
  });

  describe('predictThumbnailCTR', () => {
    it('should give higher CTR for face + text thumbnails', () => {
      const full = predictThumbnailCTR(true, true, 4);
      const plain = predictThumbnailCTR(false, false, 1);
      expect(full).toBeGreaterThan(plain);
    });

    it('should return reasonable CTR range', () => {
      const ctr = predictThumbnailCTR(true, true, 3);
      expect(ctr).toBeGreaterThan(0.01);
      expect(ctr).toBeLessThan(0.15);
    });
  });

  describe('generateViralHooks', () => {
    it('should return 5 hook suggestions', () => {
      const hooks = generateViralHooks('my original hook', 'AI marketing');
      expect(hooks).toHaveLength(5);
    });

    it('should sort by retention prediction descending', () => {
      const hooks = generateViralHooks('test hook', 'crypto');
      for (let i = 1; i < hooks.length; i++) {
        expect(hooks[i - 1].retentionPrediction).toBeGreaterThanOrEqual(hooks[i].retentionPrediction);
      }
    });

    it('should include emotional triggers', () => {
      const hooks = generateViralHooks('test', 'fitness');
      hooks.forEach(h => {
        expect(h.emotionalTrigger).toBeTruthy();
      });
    });
  });

  describe('scoreThumbnailVariant', () => {
    it('should return predicted CTR', () => {
      const variant = scoreThumbnailVariant('t1', 'http://img.com/1.jpg', true, true, ['#ff0000', '#00ff00', '#0000ff']);
      expect(variant.predictedCTR).toBeGreaterThan(0);
      expect(variant.emotionalAppeal).toBe('personal');
    });

    it('should classify emotional appeal correctly', () => {
      const noFace = scoreThumbnailVariant('t2', 'url', true, false, []);
      expect(noFace.emotionalAppeal).toBe('informational');

      const noFaceNoText = scoreThumbnailVariant('t3', 'url', false, false, []);
      expect(noFaceNoText.emotionalAppeal).toBe('aesthetic');
    });
  });

  describe('selectBestThumbnail', () => {
    it('should select highest CTR thumbnail', () => {
      const v1 = scoreThumbnailVariant('a', 'url', false, false, []);
      const v2 = scoreThumbnailVariant('b', 'url', true, true, ['r', 'g', 'b']);
      const best = selectBestThumbnail([v1, v2]);
      expect(best?.id).toBe('b');
    });

    it('should return null for empty array', () => {
      expect(selectBestThumbnail([])).toBeNull();
    });
  });

  describe('generateScriptOutline', () => {
    it('should generate a complete script', () => {
      const script = generateScriptOutline('c1', 'youtube_short', 'AI Tools', 'casual');
      expect(script.creatorId).toBe('c1');
      expect(script.format).toBe('youtube_short');
      expect(script.hook).toBeTruthy();
      expect(script.body).toBeTruthy();
      expect(script.callToAction).toBeTruthy();
      expect(script.estimatedDuration).toBe(45); // youtube_short
    });

    it('should set longer duration for podcasts', () => {
      const script = generateScriptOutline('c2', 'podcast', 'Startups', 'professional');
      expect(script.estimatedDuration).toBe(1800);
    });

    it('should use linkedin-specific CTA', () => {
      const script = generateScriptOutline('c3', 'linkedin', 'Leadership', 'authoritative');
      expect(script.callToAction).toContain('comment');
    });
  });
});

// ════════════════════════════════════════════════════════════════
// 4. War Room
// ════════════════════════════════════════════════════════════════

describe('War Room', () => {
  describe('classifyRiskColor', () => {
    it('should return green for low risk', () => {
      expect(classifyRiskColor(10)).toBe('green');
      expect(classifyRiskColor(25)).toBe('green');
    });

    it('should return yellow for moderate risk', () => {
      expect(classifyRiskColor(30)).toBe('yellow');
      expect(classifyRiskColor(50)).toBe('yellow');
    });

    it('should return orange for elevated risk', () => {
      expect(classifyRiskColor(60)).toBe('orange');
      expect(classifyRiskColor(75)).toBe('orange');
    });

    it('should return red for critical risk', () => {
      expect(classifyRiskColor(80)).toBe('red');
      expect(classifyRiskColor(100)).toBe('red');
    });
  });

  describe('calculatePortfolioHealth', () => {
    it('should return 0 for empty portfolio', () => {
      expect(calculatePortfolioHealth([])).toBe(0);
    });

    it('should return high health for low-risk high-engagement portfolio', () => {
      const creators: PortfolioCreator[] = [
        { creatorId: '1', name: 'A', platform: 'youtube', followers: 1000000, engagementRate: 0.08, ltv12Month: 100000, riskScore: 10, activeCampaigns: 3, totalRevenue: 50000, ranking: 1, trend: 'up' },
        { creatorId: '2', name: 'B', platform: 'tiktok', followers: 500000, engagementRate: 0.06, ltv12Month: 80000, riskScore: 15, activeCampaigns: 2, totalRevenue: 40000, ranking: 2, trend: 'stable' },
      ];

      const health = calculatePortfolioHealth(creators);
      expect(health).toBeGreaterThan(50);
    });

    it('should return lower health for high-risk portfolio', () => {
      const lowRisk: PortfolioCreator[] = [
        { creatorId: '1', name: 'A', platform: 'youtube', followers: 100000, engagementRate: 0.05, ltv12Month: 50000, riskScore: 10, activeCampaigns: 1, totalRevenue: 20000, ranking: 1, trend: 'up' },
      ];

      const highRisk: PortfolioCreator[] = [
        { creatorId: '2', name: 'B', platform: 'youtube', followers: 100000, engagementRate: 0.05, ltv12Month: 50000, riskScore: 80, activeCampaigns: 1, totalRevenue: 20000, ranking: 1, trend: 'down' },
      ];

      expect(calculatePortfolioHealth(lowRisk)).toBeGreaterThan(calculatePortfolioHealth(highRisk));
    });
  });
});

// ════════════════════════════════════════════════════════════════
// 5. Route Registration
// ════════════════════════════════════════════════════════════════

describe('Enterprise V3 Route Registration', () => {
  let app: any;

  beforeAll(() => {
    // Import app AFTER all modules are loaded
    const server = require('../server');
    app = server.app;
  });

  it('should register /api/intelligence routes', () => {
    const routes = app._router.stack
      .filter((s: any) => s.route || (s.handle && s.handle.stack))
      .map((s: any) => s.regexp?.source || '');
    const routeStr = routes.join(' ');
    expect(routeStr).toContain('intelligence');
  });

  it('should register /api/fintech-v2 routes', () => {
    const routes = app._router.stack
      .filter((s: any) => s.route || (s.handle && s.handle.stack))
      .map((s: any) => s.regexp?.source || '');
    const routeStr = routes.join(' ');
    expect(routeStr).toContain('fintech-v2');
  });

  it('should register /api/content-ai routes', () => {
    const routes = app._router.stack
      .filter((s: any) => s.route || (s.handle && s.handle.stack))
      .map((s: any) => s.regexp?.source || '');
    const routeStr = routes.join(' ');
    expect(routeStr).toContain('content-ai');
  });

  it('should register /api/war-room routes', () => {
    const routes = app._router.stack
      .filter((s: any) => s.route || (s.handle && s.handle.stack))
      .map((s: any) => s.regexp?.source || '');
    const routeStr = routes.join(' ');
    expect(routeStr).toContain('war-room');
  });
});
