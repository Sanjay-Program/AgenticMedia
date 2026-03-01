import {
  INTEGRATION_REGISTRY,
  type IntegrationProvider,
  type IntegrationCategory,
  type SocialPlatform,
  type ConnectionStatus,
  type SocialConnection,
  type AutomationWorkflow,
  type AutomationTriggerType,
  type AutomationActionType,
} from '@agenticmedia/shared-types';

describe('Integration Types', () => {
  describe('INTEGRATION_REGISTRY', () => {
    it('should contain all 8 supported providers', () => {
      expect(INTEGRATION_REGISTRY).toHaveLength(8);
      const providers = INTEGRATION_REGISTRY.map(i => i.provider);
      expect(providers).toContain('youtube');
      expect(providers).toContain('instagram');
      expect(providers).toContain('tiktok');
      expect(providers).toContain('twitter');
      expect(providers).toContain('linkedin');
      expect(providers).toContain('hubspot');
      expect(providers).toContain('gmail');
      expect(providers).toContain('slack');
    });

    it('should categorize social media providers correctly', () => {
      const socialProviders = INTEGRATION_REGISTRY.filter(i => i.category === 'social');
      expect(socialProviders).toHaveLength(5);
      const socialNames = socialProviders.map(i => i.provider);
      expect(socialNames).toContain('youtube');
      expect(socialNames).toContain('instagram');
      expect(socialNames).toContain('tiktok');
      expect(socialNames).toContain('twitter');
      expect(socialNames).toContain('linkedin');
    });

    it('should categorize CRM/email/messaging providers correctly', () => {
      const crm = INTEGRATION_REGISTRY.filter(i => i.category === 'crm');
      const email = INTEGRATION_REGISTRY.filter(i => i.category === 'email');
      const messaging = INTEGRATION_REGISTRY.filter(i => i.category === 'messaging');
      expect(crm).toHaveLength(1);
      expect(email).toHaveLength(1);
      expect(messaging).toHaveLength(1);
      expect(crm[0].provider).toBe('hubspot');
      expect(email[0].provider).toBe('gmail');
      expect(messaging[0].provider).toBe('slack');
    });

    it('should have valid structure for every integration', () => {
      for (const integration of INTEGRATION_REGISTRY) {
        expect(integration.provider).toBeTruthy();
        expect(integration.category).toBeTruthy();
        expect(integration.name).toBeTruthy();
        expect(integration.description.length).toBeGreaterThan(10);
        expect(integration.icon).toBeTruthy();
        expect(integration.scopes.length).toBeGreaterThan(0);
        expect(integration.features.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Type Coverage', () => {
    it('should define all social platforms', () => {
      const platforms: SocialPlatform[] = ['youtube', 'instagram', 'tiktok', 'twitter', 'linkedin'];
      expect(platforms).toHaveLength(5);
    });

    it('should define all integration providers', () => {
      const providers: IntegrationProvider[] = [
        'hubspot', 'gmail', 'youtube', 'instagram', 'tiktok', 'twitter', 'linkedin', 'slack', 'google',
      ];
      expect(providers).toHaveLength(9);
    });

    it('should define all integration categories', () => {
      const categories: IntegrationCategory[] = ['social', 'crm', 'email', 'messaging'];
      expect(categories).toHaveLength(4);
    });

    it('should define all connection statuses', () => {
      const statuses: ConnectionStatus[] = ['connected', 'disconnected', 'expired', 'error'];
      expect(statuses).toHaveLength(4);
    });

    it('should define SocialConnection interface correctly', () => {
      const connection: SocialConnection = {
        id: '123',
        organizationId: 'org-1',
        userId: 'user-1',
        platform: 'youtube',
        platformUserId: 'YT123',
        platformUsername: '@creator',
        displayName: 'Creator Studio',
        profileUrl: 'https://youtube.com/@creator',
        followersCount: 250000,
        status: 'connected',
        scopes: ['youtube.readonly'],
        lastSyncedAt: '2026-03-01T00:00:00Z',
        connectedAt: '2026-01-01T00:00:00Z',
      };
      expect(connection.platform).toBe('youtube');
      expect(connection.followersCount).toBe(250000);
    });

    it('should define AutomationWorkflow interface correctly', () => {
      const workflow: AutomationWorkflow = {
        id: 'wf-1',
        organizationId: 'org-1',
        name: 'Auto-sync YouTube metrics',
        description: 'Sync YouTube analytics every 6 hours',
        trigger: { type: 'schedule.cron', config: { cron: '0 */6 * * *' } },
        actions: [{ type: 'sync.social.metrics', config: { platform: 'youtube' } }],
        isActive: true,
        lastRunAt: null,
        runCount: 0,
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z',
      };
      expect(workflow.trigger.type).toBe('schedule.cron');
      expect(workflow.actions).toHaveLength(1);
    });

    it('should define all automation trigger types', () => {
      const triggers: AutomationTriggerType[] = [
        'social.metric.updated', 'social.creator.discovered', 'email.replied',
        'payment.succeeded', 'contract.signed', 'agent.run.completed', 'schedule.cron',
      ];
      expect(triggers).toHaveLength(7);
    });

    it('should define all automation action types', () => {
      const actions: AutomationActionType[] = [
        'sync.social.metrics', 'send.email', 'create.campaign',
        'notify.slack', 'update.crm', 'run.agent',
      ];
      expect(actions).toHaveLength(6);
    });
  });
});
