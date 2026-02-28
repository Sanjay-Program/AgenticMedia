// Phase 1: IAM & Zero-Trust Security Types

export type AuditAction =
  | 'create' | 'read' | 'update' | 'delete'
  | 'login' | 'logout' | 'token_refresh'
  | 'export' | 'import' | 'approve' | 'reject'
  | 'agent_action';

export type AuditActorType = 'user' | 'ai_agent' | 'system' | 'api_key';

export interface AuditEvent {
  id: string;
  organizationId: string;
  actorType: AuditActorType;
  actorId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface CreateAuditEventInput {
  organizationId: string;
  actorType: AuditActorType;
  actorId: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// ABAC (Attribute-Based Access Control)
export type PolicyEffect = 'allow' | 'deny';

export interface ABACPolicy {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  effect: PolicyEffect;
  conditions: ABACConditions;
  resourceType: string;
  actions: string[];
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ABACConditions {
  roles?: string[];
  planTiers?: string[];
  ipWhitelist?: string[];
  timeWindow?: { start: string; end: string };
  customAttributes?: Record<string, unknown>;
}

export interface ABACEvaluationContext {
  userId: string;
  organizationId: string;
  role: string;
  planTier: string;
  ipAddress?: string;
  resourceType: string;
  action: string;
  resourceAttributes?: Record<string, unknown>;
}

// SSO/SAML
export type SSOProvider = 'okta' | 'google_workspace' | 'azure_ad' | 'custom_saml';

export interface SSOConfiguration {
  id: string;
  organizationId: string;
  provider: SSOProvider;
  entityId: string;
  ssoUrl: string;
  certificate: string;
  metadataUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
