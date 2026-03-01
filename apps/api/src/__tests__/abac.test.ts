// Test ABAC condition matching logic
import type { ABACConditions, ABACEvaluationContext } from '@agenticmedia/shared-types';

// Extract the pure function for testing without DB dependency
function matchesConditions(conditions: ABACConditions, context: ABACEvaluationContext): boolean {
  if (conditions.roles && conditions.roles.length > 0) {
    if (!conditions.roles.includes(context.role)) {
      return false;
    }
  }

  if (conditions.planTiers && conditions.planTiers.length > 0) {
    if (!conditions.planTiers.includes(context.planTier)) {
      return false;
    }
  }

  if (conditions.ipWhitelist && conditions.ipWhitelist.length > 0 && context.ipAddress) {
    if (!conditions.ipWhitelist.includes(context.ipAddress)) {
      return false;
    }
  }

  if (conditions.timeWindow) {
    const now = new Date();
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    if (currentTime < conditions.timeWindow.start || currentTime > conditions.timeWindow.end) {
      return false;
    }
  }

  return true;
}

describe('ABAC Policy Evaluation', () => {
  const baseContext: ABACEvaluationContext = {
    userId: 'user-1',
    organizationId: 'org-1',
    role: 'admin',
    planTier: 'enterprise',
    ipAddress: '192.168.1.1',
    resourceType: 'creators',
    action: 'read',
  };

  it('should match when no conditions are specified', () => {
    expect(matchesConditions({}, baseContext)).toBe(true);
  });

  it('should match when role is in allowed roles', () => {
    const conditions: ABACConditions = { roles: ['admin', 'talent_manager'] };
    expect(matchesConditions(conditions, baseContext)).toBe(true);
  });

  it('should not match when role is not in allowed roles', () => {
    const conditions: ABACConditions = { roles: ['client_readonly'] };
    expect(matchesConditions(conditions, baseContext)).toBe(false);
  });

  it('should match when plan tier is in allowed tiers', () => {
    const conditions: ABACConditions = { planTiers: ['growth', 'enterprise'] };
    expect(matchesConditions(conditions, baseContext)).toBe(true);
  });

  it('should not match when plan tier is not in allowed tiers', () => {
    const conditions: ABACConditions = { planTiers: ['starter'] };
    expect(matchesConditions(conditions, baseContext)).toBe(false);
  });

  it('should match when IP is in whitelist', () => {
    const conditions: ABACConditions = { ipWhitelist: ['192.168.1.1', '10.0.0.1'] };
    expect(matchesConditions(conditions, baseContext)).toBe(true);
  });

  it('should not match when IP is not in whitelist', () => {
    const conditions: ABACConditions = { ipWhitelist: ['10.0.0.1'] };
    expect(matchesConditions(conditions, baseContext)).toBe(false);
  });

  it('should match combined conditions when all pass', () => {
    const conditions: ABACConditions = {
      roles: ['admin'],
      planTiers: ['enterprise'],
      ipWhitelist: ['192.168.1.1'],
    };
    expect(matchesConditions(conditions, baseContext)).toBe(true);
  });

  it('should not match combined conditions when one fails', () => {
    const conditions: ABACConditions = {
      roles: ['admin'],
      planTiers: ['starter'],  // This fails
      ipWhitelist: ['192.168.1.1'],
    };
    expect(matchesConditions(conditions, baseContext)).toBe(false);
  });

  it('should skip IP check when context has no IP', () => {
    const conditions: ABACConditions = { ipWhitelist: ['10.0.0.1'] };
    const contextNoIp = { ...baseContext, ipAddress: undefined };
    // When no IP in context, IP whitelist is not checked
    expect(matchesConditions(conditions, contextNoIp)).toBe(true);
  });
});
