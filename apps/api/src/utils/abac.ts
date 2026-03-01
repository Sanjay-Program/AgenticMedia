import { query } from '@agenticmedia/database';
import type { ABACPolicy, ABACConditions, ABACEvaluationContext } from '@agenticmedia/shared-types';

/**
 * Evaluates ABAC policies for a given context.
 * Policies are evaluated in priority order (higher priority first).
 * Returns true if access is allowed, false if denied.
 * If no matching policy is found, defaults to the RBAC result (allow).
 */
export async function evaluateABAC(context: ABACEvaluationContext): Promise<boolean> {
  const result = await query(
    `SELECT id, effect, conditions, actions, priority
     FROM abac_policies
     WHERE organization_id = $1
       AND resource_type = $2
       AND is_active = TRUE
       AND $3 = ANY(actions)
     ORDER BY priority DESC`,
    [context.organizationId, context.resourceType, context.action]
  );

  const policies = result.rows as Array<{
    id: string;
    effect: string;
    conditions: ABACConditions;
    actions: string[];
    priority: number;
  }>;

  // No ABAC policies — fall through to RBAC
  if (policies.length === 0) {
    return true;
  }

  for (const policy of policies) {
    if (matchesConditions(policy.conditions, context)) {
      return policy.effect === 'allow';
    }
  }

  // No matching policy — default allow (RBAC governs)
  return true;
}

function matchesConditions(conditions: ABACConditions, context: ABACEvaluationContext): boolean {
  // Role check
  if (conditions.roles && conditions.roles.length > 0) {
    if (!conditions.roles.includes(context.role)) {
      return false;
    }
  }

  // Plan tier check
  if (conditions.planTiers && conditions.planTiers.length > 0) {
    if (!conditions.planTiers.includes(context.planTier)) {
      return false;
    }
  }

  // IP whitelist check
  if (conditions.ipWhitelist && conditions.ipWhitelist.length > 0 && context.ipAddress) {
    if (!conditions.ipWhitelist.includes(context.ipAddress)) {
      return false;
    }
  }

  // Time window check
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
