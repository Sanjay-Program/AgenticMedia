/**
 * Tests for the new backend route modules.
 * Validates that all route files export proper Express routers
 * and that route schemas validate correctly.
 */

import { z } from 'zod';

// Import all new route modules to verify they load without errors
describe('Backend Route Modules', () => {
  test('dashboard route exports a valid router', () => {
    const { dashboardRouter } = require('../routes/dashboard');
    expect(dashboardRouter).toBeDefined();
    expect(typeof dashboardRouter).toBe('function');
    expect(dashboardRouter.stack).toBeDefined();
    // Should have /stats and /activity routes
    const paths = dashboardRouter.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => layer.route.path);
    expect(paths).toContain('/stats');
    expect(paths).toContain('/activity');
  });

  test('agents route exports a valid router', () => {
    const { agentsRouter } = require('../routes/agents');
    expect(agentsRouter).toBeDefined();
    expect(typeof agentsRouter).toBe('function');
    const paths = agentsRouter.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => layer.route.path);
    expect(paths).toContain('/runs');
    expect(paths).toContain('/runs/:id');
    expect(paths).toContain('/stats');
  });

  test('automations route exports a valid router with CRUD', () => {
    const { automationsRouter } = require('../routes/automations');
    expect(automationsRouter).toBeDefined();
    expect(typeof automationsRouter).toBe('function');
    const routes = automationsRouter.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));
    // Check CRUD operations exist
    expect(routes.find((r: any) => r.path === '/' && r.methods.includes('get'))).toBeTruthy();
    expect(routes.find((r: any) => r.path === '/' && r.methods.includes('post'))).toBeTruthy();
    expect(routes.find((r: any) => r.path === '/:id' && r.methods.includes('get'))).toBeTruthy();
    expect(routes.find((r: any) => r.path === '/:id' && r.methods.includes('patch'))).toBeTruthy();
    expect(routes.find((r: any) => r.path === '/:id' && r.methods.includes('delete'))).toBeTruthy();
    expect(routes.find((r: any) => r.path === '/:id/toggle' && r.methods.includes('post'))).toBeTruthy();
  });

  test('users route exports a valid router with team management', () => {
    const { usersRouter } = require('../routes/users');
    expect(usersRouter).toBeDefined();
    const paths = usersRouter.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => layer.route.path);
    expect(paths).toContain('/team');
    expect(paths).toContain('/profile');
    expect(paths).toContain('/change-password');
    expect(paths).toContain('/invite');
    expect(paths).toContain('/:id/role');
    expect(paths).toContain('/:id/deactivate');
    expect(paths).toContain('/:id/reactivate');
  });

  test('organizations route exports a valid router', () => {
    const { organizationsRouter } = require('../routes/organizations');
    expect(organizationsRouter).toBeDefined();
    const paths = organizationsRouter.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => layer.route.path);
    expect(paths).toContain('/current');
    expect(paths).toContain('/billing');
  });

  test('audit route exports a valid router', () => {
    const { auditRouter } = require('../routes/audit');
    expect(auditRouter).toBeDefined();
    const paths = auditRouter.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => layer.route.path);
    expect(paths).toContain('/events');
    expect(paths).toContain('/summary');
  });

  test('ledger route exports a valid router', () => {
    const { ledgerRouter } = require('../routes/ledger');
    expect(ledgerRouter).toBeDefined();
    const paths = ledgerRouter.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => layer.route.path);
    expect(paths).toContain('/accounts');
    expect(paths).toContain('/accounts/initialize');
    expect(paths).toContain('/transactions');
    expect(paths).toContain('/balance');
    expect(paths).toContain('/balance-check');
  });
});

describe('Server Registration', () => {
  test('server app exports and registers all routes', () => {
    const { app } = require('../server');
    expect(app).toBeDefined();

    // Extract mounted route prefixes
    const mountedPaths = app._router.stack
      .filter((layer: any) => layer.name === 'router')
      .map((layer: any) => layer.regexp.toString());

    // All 14 route prefixes should be mounted
    const expectedPrefixes = [
      '/api/auth', '/api/creators', '/api/outreach', '/api/discovery',
      '/api/fintech', '/api/webhooks', '/api/integrations',
      '/api/dashboard', '/api/agents', '/api/automations',
      '/api/users', '/api/organizations', '/api/audit', '/api/ledger',
    ];

    for (const prefix of expectedPrefixes) {
      const found = mountedPaths.some((regexp: string) =>
        regexp.includes(prefix.replace(/\//g, '\\/'))
      );
      expect(found).toBe(true);
    }
  });
});

describe('Automation Workflow Validation', () => {
  const createSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    triggerType: z.string().min(1),
    triggerConfig: z.record(z.unknown()).default({}),
    actions: z.array(z.record(z.unknown())).default([]),
    isActive: z.boolean().default(true),
  });

  test('should accept valid automation workflow', () => {
    const result = createSchema.safeParse({
      name: 'Auto-sync metrics',
      triggerType: 'social.metric.updated',
      triggerConfig: { platform: 'youtube' },
      actions: [{ type: 'sync.social.metrics', config: {} }],
    });
    expect(result.success).toBe(true);
  });

  test('should reject empty name', () => {
    const result = createSchema.safeParse({
      name: '',
      triggerType: 'social.metric.updated',
    });
    expect(result.success).toBe(false);
  });

  test('should default isActive to true', () => {
    const result = createSchema.safeParse({
      name: 'Test Automation',
      triggerType: 'email.replied',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });

  test('should default actions to empty array', () => {
    const result = createSchema.safeParse({
      name: 'Test Automation',
      triggerType: 'email.replied',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actions).toEqual([]);
    }
  });
});

describe('User Management Validation', () => {
  const inviteSchema = z.object({
    email: z.string().email(),
    fullName: z.string().min(1).max(255),
    role: z.enum(['admin', 'talent_manager', 'data_analyst', 'client_readonly']),
  });

  test('should accept valid invite', () => {
    const result = inviteSchema.safeParse({
      email: 'new@example.com',
      fullName: 'New User',
      role: 'talent_manager',
    });
    expect(result.success).toBe(true);
  });

  test('should reject invalid email', () => {
    const result = inviteSchema.safeParse({
      email: 'not-an-email',
      fullName: 'Test',
      role: 'admin',
    });
    expect(result.success).toBe(false);
  });

  test('should reject invalid role', () => {
    const result = inviteSchema.safeParse({
      email: 'test@example.com',
      fullName: 'Test',
      role: 'superadmin',
    });
    expect(result.success).toBe(false);
  });

  test('should accept all valid roles', () => {
    const roles = ['admin', 'talent_manager', 'data_analyst', 'client_readonly'];
    for (const role of roles) {
      const result = inviteSchema.safeParse({
        email: 'test@example.com',
        fullName: 'Test',
        role,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('Fintech Route Extensions', () => {
  test('fintech router includes campaign update and contract activation routes', () => {
    const { fintechRouter } = require('../routes/fintech');
    const routes = fintechRouter.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    // Original routes
    expect(routes.find((r: any) => r.path === '/campaigns' && r.methods.includes('get'))).toBeTruthy();
    expect(routes.find((r: any) => r.path === '/campaigns' && r.methods.includes('post'))).toBeTruthy();
    expect(routes.find((r: any) => r.path === '/contracts' && r.methods.includes('post'))).toBeTruthy();

    // New routes
    expect(routes.find((r: any) => r.path === '/campaigns/:id' && r.methods.includes('patch'))).toBeTruthy();
    expect(routes.find((r: any) => r.path === '/campaigns/:id' && r.methods.includes('get'))).toBeTruthy();
    expect(routes.find((r: any) => r.path === '/contracts/:id/activate' && r.methods.includes('post'))).toBeTruthy();
  });
});

describe('Creator Route Extensions', () => {
  test('creators router includes update and delete routes', () => {
    const { creatorsRouter } = require('../routes/creators');
    const routes = creatorsRouter.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    // Original routes
    expect(routes.find((r: any) => r.path === '/' && r.methods.includes('get'))).toBeTruthy();
    expect(routes.find((r: any) => r.path === '/' && r.methods.includes('post'))).toBeTruthy();
    expect(routes.find((r: any) => r.path === '/:id' && r.methods.includes('get'))).toBeTruthy();

    // New routes
    expect(routes.find((r: any) => r.path === '/:id' && r.methods.includes('patch'))).toBeTruthy();
    expect(routes.find((r: any) => r.path === '/:id' && r.methods.includes('delete'))).toBeTruthy();
  });
});
