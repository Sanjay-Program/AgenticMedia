/**
 * Tests for the Enterprise Value Modules:
 * - Module 1: Predictive Scouting Engine (calculateVelocityScore)
 * - Module 4: Agency Command Center (branding validation)
 * - Module 5/6: NeuraForge Video Engine (FFmpeg command building, platform formats)
 * - Module 7: Crisis Shield (sentiment classification, crisis detection)
 */

import { calculateVelocityScore } from '../services/agents/scout';
import { classifySentiment, evaluateCrisisLevel } from '../services/agents/sentiment';
import { buildCaptionOverlayCommand, buildFormatAdaptCommand } from '../services/video-engine';
import {
  SCOUT_THRESHOLDS,
  CRISIS_THRESHOLDS,
  PLATFORM_FORMATS,
  isValidHexColor,
  DEFAULT_BRANDING,
} from '@agenticmedia/shared-types';

describe('Module 1: Predictive Scouting Engine', () => {
  describe('calculateVelocityScore', () => {
    it('should return zero score when fewer than MIN_RECENT_VIDEOS provided', () => {
      const score = calculateVelocityScore('cp-1', 'tiktok', [
        { videoId: 'v1', views: 1000000, likes: 50000, comments: 5000, shares: 2000, publishedAt: '2024-01-01' },
      ], 10000, 0.05, 5000);

      expect(score.overallScore).toBe(0);
      expect(score.isBreakout).toBe(false);
      expect(score.creatorPlatformId).toBe('cp-1');
    });

    it('should detect breakout when views are 10x+ baseline', () => {
      const recentVideos = [
        { videoId: 'v1', views: 1000000, likes: 50000, comments: 5000, shares: 2000, publishedAt: '2024-01-01' },
        { videoId: 'v2', views: 800000, likes: 40000, comments: 4000, shares: 1500, publishedAt: '2024-01-02' },
        { videoId: 'v3', views: 1200000, likes: 60000, comments: 6000, shares: 3000, publishedAt: '2024-01-03' },
      ];

      const score = calculateVelocityScore('cp-2', 'tiktok', recentVideos, 50000, 0.05, 5000);

      expect(score.isBreakout).toBe(true);
      expect(score.velocityMultiplier).toBeGreaterThanOrEqual(SCOUT_THRESHOLDS.VIEWS_MULTIPLIER);
      expect(score.overallScore).toBeGreaterThan(30);
      expect(score.recentAvgViews).toBe(1000000);
    });

    it('should not flag breakout for creators below MIN_FOLLOWERS', () => {
      const recentVideos = [
        { videoId: 'v1', views: 1000000, likes: 50000, comments: 5000, shares: 2000, publishedAt: '2024-01-01' },
        { videoId: 'v2', views: 800000, likes: 40000, comments: 4000, shares: 1500, publishedAt: '2024-01-02' },
        { videoId: 'v3', views: 1200000, likes: 60000, comments: 6000, shares: 3000, publishedAt: '2024-01-03' },
      ];

      const score = calculateVelocityScore('cp-3', 'tiktok', recentVideos, 50000, 0.05, 500);

      expect(score.isBreakout).toBe(false); // Below 1000 follower threshold
      expect(score.velocityMultiplier).toBeGreaterThanOrEqual(10);
    });

    it('should calculate engagement spike correctly', () => {
      const recentVideos = [
        { videoId: 'v1', views: 10000, likes: 5000, comments: 2000, shares: 1000, publishedAt: '2024-01-01' },
        { videoId: 'v2', views: 10000, likes: 4000, comments: 1500, shares: 800, publishedAt: '2024-01-02' },
        { videoId: 'v3', views: 10000, likes: 6000, comments: 2500, shares: 1200, publishedAt: '2024-01-03' },
      ];

      const score = calculateVelocityScore('cp-4', 'instagram', recentVideos, 10000, 0.05, 2000);

      expect(score.engagementSpike).toBeGreaterThan(1);
      expect(score.platform).toBe('instagram');
    });

    it('should handle zero historical averages gracefully', () => {
      const recentVideos = [
        { videoId: 'v1', views: 100, likes: 10, comments: 5, shares: 2, publishedAt: '2024-01-01' },
        { videoId: 'v2', views: 200, likes: 15, comments: 3, shares: 1, publishedAt: '2024-01-02' },
        { videoId: 'v3', views: 150, likes: 8, comments: 2, shares: 0, publishedAt: '2024-01-03' },
      ];

      const score = calculateVelocityScore('cp-5', 'youtube', recentVideos, 0, 0, 1500);

      expect(score.velocityMultiplier).toBe(SCOUT_THRESHOLDS.VIEWS_MULTIPLIER);
      expect(score.overallScore).toBeGreaterThan(0);
    });

    it('should limit to MAX_RECENT_VIDEOS', () => {
      const recentVideos = Array.from({ length: 10 }, (_, i) => ({
        videoId: `v${i}`, views: 1000, likes: 100, comments: 50, shares: 10, publishedAt: `2024-01-0${i + 1}`,
      }));

      const score = calculateVelocityScore('cp-6', 'tiktok', recentVideos, 1000, 0.1, 2000);

      // Score should be based on first MAX_RECENT_VIDEOS only
      expect(score.recentAvgViews).toBe(1000);
    });
  });
});

describe('Module 4: Agency Command Center - Branding', () => {
  describe('isValidHexColor', () => {
    it('should accept valid 6-digit hex colors', () => {
      expect(isValidHexColor('#FF0000')).toBe(true);
      expect(isValidHexColor('#6366F1')).toBe(true);
      expect(isValidHexColor('#000000')).toBe(true);
      expect(isValidHexColor('#ffffff')).toBe(true);
    });

    it('should accept valid 3-digit hex colors', () => {
      expect(isValidHexColor('#F00')).toBe(true);
      expect(isValidHexColor('#abc')).toBe(true);
    });

    it('should reject invalid hex colors', () => {
      expect(isValidHexColor('red')).toBe(false);
      expect(isValidHexColor('#GGG')).toBe(false);
      expect(isValidHexColor('FF0000')).toBe(false);
      expect(isValidHexColor('#FF00')).toBe(false);
      expect(isValidHexColor('')).toBe(false);
    });
  });

  describe('DEFAULT_BRANDING', () => {
    it('should have all required fields', () => {
      expect(DEFAULT_BRANDING).toHaveProperty('primaryColor');
      expect(DEFAULT_BRANDING).toHaveProperty('accentColor');
      expect(DEFAULT_BRANDING).toHaveProperty('backgroundColor');
      expect(DEFAULT_BRANDING).toHaveProperty('textColor');
      expect(DEFAULT_BRANDING).toHaveProperty('fontFamily');
      expect(DEFAULT_BRANDING).toHaveProperty('companyName');
    });

    it('should have valid hex colors in defaults', () => {
      expect(isValidHexColor(DEFAULT_BRANDING.primaryColor)).toBe(true);
      expect(isValidHexColor(DEFAULT_BRANDING.accentColor)).toBe(true);
      expect(isValidHexColor(DEFAULT_BRANDING.backgroundColor)).toBe(true);
      expect(isValidHexColor(DEFAULT_BRANDING.textColor)).toBe(true);
    });
  });
});

describe('Module 5/6: NeuraForge Video Engine', () => {
  describe('buildCaptionOverlayCommand', () => {
    it('should generate valid FFmpeg arguments for caption overlay', () => {
      const args = buildCaptionOverlayCommand('/input.mp4', '/subs.srt', '/output.mp4');

      expect(args).toContain('-i');
      expect(args).toContain('/input.mp4');
      expect(args).toContain('-c:v');
      expect(args).toContain('libx264');
      expect(args).toContain('/output.mp4');
      expect(args[args.indexOf('-vf') + 1]).toContain('subtitles=');
    });

    it('should apply custom style parameters', () => {
      const args = buildCaptionOverlayCommand('/in.mp4', '/subs.srt', '/out.mp4', {
        fontName: 'Helvetica',
        fontSize: 32,
      });

      const vfArg = args[args.indexOf('-vf') + 1];
      expect(vfArg).toContain('Helvetica');
      expect(vfArg).toContain('FontSize=32');
    });
  });

  describe('buildFormatAdaptCommand', () => {
    it('should generate 9:16 crop for TikTok', () => {
      const args = buildFormatAdaptCommand('/in.mp4', '/out.mp4', 'tiktok');

      const vfArg = args[args.indexOf('-vf') + 1];
      expect(vfArg).toContain('1080');
      expect(vfArg).toContain('1920');
      expect(args).toContain('-t'); // Duration limit
      expect(args[args.indexOf('-t') + 1]).toBe('180');
    });

    it('should generate 1:1 crop for LinkedIn', () => {
      const args = buildFormatAdaptCommand('/in.mp4', '/out.mp4', 'linkedin');

      const vfArg = args[args.indexOf('-vf') + 1];
      expect(vfArg).toContain('1080:1080');
    });

    it('should NOT apply duration limit for full YouTube videos', () => {
      const args = buildFormatAdaptCommand('/in.mp4', '/out.mp4', 'youtube');

      expect(args.includes('-t')).toBe(false);
    });

    it('should apply 60s limit for YouTube Shorts', () => {
      const args = buildFormatAdaptCommand('/in.mp4', '/out.mp4', 'youtube_shorts');

      expect(args).toContain('-t');
      expect(args[args.indexOf('-t') + 1]).toBe('60');
    });
  });

  describe('PLATFORM_FORMATS', () => {
    it('should define all 5 target platforms', () => {
      expect(Object.keys(PLATFORM_FORMATS)).toEqual([
        'tiktok', 'youtube_shorts', 'instagram_reels', 'linkedin', 'youtube',
      ]);
    });

    it('should have 9:16 aspect ratio for vertical formats', () => {
      expect(PLATFORM_FORMATS.tiktok.aspectRatio).toBe('9:16');
      expect(PLATFORM_FORMATS.youtube_shorts.aspectRatio).toBe('9:16');
      expect(PLATFORM_FORMATS.instagram_reels.aspectRatio).toBe('9:16');
    });

    it('should have correct resolution for each platform', () => {
      for (const [, format] of Object.entries(PLATFORM_FORMATS)) {
        expect(format.resolution.width).toBeGreaterThan(0);
        expect(format.resolution.height).toBeGreaterThan(0);
        expect(format.maxDuration).toBeGreaterThan(0);
      }
    });
  });
});

describe('Module 7: Crisis Shield - Sentiment Engine', () => {
  describe('classifySentiment', () => {
    it('should classify positive text correctly', () => {
      const result = classifySentiment('This is amazing! I love your content! Best video ever!');
      expect(result.sentiment).toBe('positive');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should classify negative text correctly', () => {
      const result = classifySentiment('This is terrible and boring. Worst video ever.');
      expect(result.sentiment).toBe('negative');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should classify toxic text correctly', () => {
      const result = classifySentiment('You are a disgusting racist fraud scam trash');
      expect(result.sentiment).toBe('toxic');
      expect(result.toxicityScore).toBeGreaterThan(0.5);
    });

    it('should classify neutral text correctly', () => {
      const result = classifySentiment('I watched the video today.');
      expect(result.sentiment).toBe('neutral');
    });

    it('should handle empty-ish text', () => {
      const result = classifySentiment('ok');
      expect(result.sentiment).toBe('neutral');
    });
  });

  describe('evaluateCrisisLevel', () => {
    it('should return normal when below threshold', () => {
      expect(evaluateCrisisLevel(8, 1, 1, 0)).toBe('normal');
    });

    it('should return normal when too few comments in window', () => {
      expect(evaluateCrisisLevel(0, 0, 3, 1)).toBe('normal');
    });

    it('should return watch at 40%+ negative', () => {
      expect(evaluateCrisisLevel(3, 0, 3, 0)).toBe('watch');
    });

    it('should return warning at 60%+ negative', () => {
      expect(evaluateCrisisLevel(1, 1, 5, 3)).toBe('critical');
    });

    it('should return critical at 80%+ negative', () => {
      expect(evaluateCrisisLevel(0, 1, 6, 3)).toBe('critical');
    });

    it('should count both negative and toxic as negative', () => {
      // 5 toxic + 0 negative = 50% → watch
      expect(evaluateCrisisLevel(3, 2, 0, 5)).toBe('watch');
    });
  });

  describe('CRISIS_THRESHOLDS', () => {
    it('should have ascending threshold values', () => {
      expect(CRISIS_THRESHOLDS.WATCH_THRESHOLD).toBeLessThan(CRISIS_THRESHOLDS.WARNING_THRESHOLD);
      expect(CRISIS_THRESHOLDS.WARNING_THRESHOLD).toBeLessThan(CRISIS_THRESHOLDS.CRITICAL_THRESHOLD);
    });

    it('should have reasonable window configuration', () => {
      expect(CRISIS_THRESHOLDS.WINDOW_MINUTES).toBeGreaterThan(0);
      expect(CRISIS_THRESHOLDS.MIN_COMMENTS_IN_WINDOW).toBeGreaterThan(0);
    });
  });
});

describe('Enterprise Route Registration', () => {
  it('should register all enterprise routes in server', async () => {
    const { app } = await import('../server');
    const routes = (app as any)._router.stack
      .filter((r: any) => r.route || (r.name === 'router' && r.regexp))
      .map((r: any) => {
        if (r.route) return r.route.path;
        const match = r.regexp?.toString();
        return match;
      });

    const routeString = routes.join('|');
    expect(routeString).toContain('scout');
    expect(routeString).toContain('video');
    expect(routeString).toContain('sentiment');
    expect(routeString).toContain('branding');
  });
});
