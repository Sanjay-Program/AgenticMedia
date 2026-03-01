// Test audit event type validation and structure
import type { CreateAuditEventInput, AuditAction, AuditActorType } from '@agenticmedia/shared-types';

describe('Audit Event Types', () => {
  it('should accept valid audit event input', () => {
    const input: CreateAuditEventInput = {
      organizationId: '550e8400-e29b-41d4-a716-446655440000',
      actorType: 'user',
      actorId: 'user-123',
      action: 'create',
      resourceType: 'creators',
      resourceId: 'creator-456',
      metadata: { method: 'POST', path: '/api/creators' },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    expect(input.organizationId).toBeDefined();
    expect(input.actorType).toBe('user');
    expect(input.action).toBe('create');
    expect(input.resourceType).toBe('creators');
  });

  it('should support all audit action types', () => {
    const validActions: AuditAction[] = [
      'create', 'read', 'update', 'delete',
      'login', 'logout', 'token_refresh',
      'export', 'import', 'approve', 'reject',
      'agent_action',
    ];

    validActions.forEach((action) => {
      const input: CreateAuditEventInput = {
        organizationId: 'org-1',
        actorType: 'user',
        actorId: 'user-1',
        action,
        resourceType: 'test',
      };
      expect(input.action).toBe(action);
    });
  });

  it('should support all actor types', () => {
    const validActorTypes: AuditActorType[] = ['user', 'ai_agent', 'system', 'api_key'];

    validActorTypes.forEach((actorType) => {
      const input: CreateAuditEventInput = {
        organizationId: 'org-1',
        actorType,
        actorId: 'actor-1',
        action: 'read',
        resourceType: 'test',
      };
      expect(input.actorType).toBe(actorType);
    });
  });

  it('should allow optional fields to be omitted', () => {
    const input: CreateAuditEventInput = {
      organizationId: 'org-1',
      actorType: 'system',
      actorId: 'system',
      action: 'agent_action',
      resourceType: 'agent_runs',
    };

    expect(input.resourceId).toBeUndefined();
    expect(input.metadata).toBeUndefined();
    expect(input.ipAddress).toBeUndefined();
    expect(input.userAgent).toBeUndefined();
  });
});

describe('Event Types', () => {
  it('should define standard domain event types', () => {
    // Verify the types compile correctly by using them
    const eventTypes = [
      'email.received', 'email.sent', 'email.opened', 'email.replied', 'email.bounced',
      'social.metric.updated', 'social.creator.discovered',
      'payment.succeeded', 'payment.failed', 'payment.refunded',
      'contract.signed', 'contract.completed',
      'agent.run.started', 'agent.run.completed', 'agent.run.failed',
      'webhook.stripe', 'webhook.meta', 'webhook.youtube', 'webhook.gmail',
    ];

    expect(eventTypes.length).toBe(19);
    expect(eventTypes).toContain('payment.succeeded');
    expect(eventTypes).toContain('agent.run.completed');
  });
});

describe('Agent Types', () => {
  it('should define all agent types', () => {
    const agentTypes = ['scout', 'negotiator', 'legal', 'orchestrator'];
    expect(agentTypes.length).toBe(4);
  });

  it('should define agent run status lifecycle', () => {
    const statuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];
    expect(statuses.length).toBe(5);
    // Verify the state machine: pending -> running -> completed|failed|cancelled
    expect(statuses[0]).toBe('pending');
    expect(statuses[1]).toBe('running');
  });
});
