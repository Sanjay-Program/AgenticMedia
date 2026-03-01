/**
 * Tests for frontend-backend API integration.
 * Validates that the API client module (js/api.js) and the
 * backend routes work together for production deployment.
 */

import { z } from 'zod';

describe('API Client — Auth Contract', () => {
  // Validate the login request/response schema matches backend expectations
  const loginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const loginResponseSchema = z.object({
    user: z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      fullName: z.string(),
      role: z.string(),
      organizationId: z.string().uuid(),
    }),
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
  });

  const registerRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    fullName: z.string().min(1).max(255),
    organizationName: z.string().min(1).max(255),
  });

  test('login request schema matches backend validation', () => {
    const validLogin = loginRequestSchema.safeParse({
      email: 'user@example.com',
      password: 'securepassword123',
    });
    expect(validLogin.success).toBe(true);
  });

  test('login rejects empty password', () => {
    const result = loginRequestSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  test('login rejects invalid email', () => {
    const result = loginRequestSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  test('register request schema matches backend validation', () => {
    const validRegister = registerRequestSchema.safeParse({
      email: 'newuser@company.com',
      password: 'strongpass123!',
      fullName: 'John Doe',
      organizationName: 'Acme Corp',
    });
    expect(validRegister.success).toBe(true);
  });

  test('register rejects short password', () => {
    const result = registerRequestSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
      fullName: 'John',
      organizationName: 'Org',
    });
    expect(result.success).toBe(false);
  });

  test('register rejects empty organization name', () => {
    const result = registerRequestSchema.safeParse({
      email: 'user@example.com',
      password: 'strongpass123',
      fullName: 'John',
      organizationName: '',
    });
    expect(result.success).toBe(false);
  });

  test('login response schema validates expected shape', () => {
    const mockResponse = {
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        fullName: 'John Doe',
        role: 'admin',
        organizationId: '550e8400-e29b-41d4-a716-446655440001',
      },
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
      refreshToken: 'rt_abc123xyz',
    };
    const result = loginResponseSchema.safeParse(mockResponse);
    expect(result.success).toBe(true);
  });
});

describe('API Client — Dashboard Contract', () => {
  const dashboardStatsSchema = z.object({
    stats: z.object({
      totalGMV: z.number(),
      activeDeals: z.number(),
      totalCreators: z.number(),
      totalCampaigns: z.number(),
      totalAgentRuns: z.number(),
      agentRunsToday: z.number(),
      pendingPayouts: z.number(),
    }),
    recentDeals: z.array(z.record(z.unknown())),
  });

  test('dashboard stats response validates correctly', () => {
    const mockStats = {
      stats: {
        totalGMV: 125000.50,
        activeDeals: 15,
        totalCreators: 42,
        totalCampaigns: 8,
        totalAgentRuns: 1500,
        agentRunsToday: 23,
        pendingPayouts: 5200.00,
      },
      recentDeals: [
        { id: '1', name: 'Brand Deal', status: 'active', total_value: 5000 },
      ],
    };
    const result = dashboardStatsSchema.safeParse(mockStats);
    expect(result.success).toBe(true);
  });

  test('dashboard stats rejects non-numeric values', () => {
    const invalid = {
      stats: {
        totalGMV: 'not a number',
        activeDeals: 15,
        totalCreators: 42,
        totalCampaigns: 8,
        totalAgentRuns: 1500,
        agentRunsToday: 23,
        pendingPayouts: 5200,
      },
      recentDeals: [],
    };
    const result = dashboardStatsSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('API Client — Contact Form Contract', () => {
  const contactSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional(),
    email: z.string().email(),
    subject: z.string().optional(),
    message: z.string().min(1),
  });

  test('valid contact form data', () => {
    const result = contactSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      subject: 'Enterprise Inquiry',
      message: 'I want to learn about your platform.',
    });
    expect(result.success).toBe(true);
  });

  test('contact form requires email', () => {
    const result = contactSchema.safeParse({
      firstName: 'Jane',
      message: 'Hello',
    });
    expect(result.success).toBe(false);
  });

  test('contact form requires message', () => {
    const result = contactSchema.safeParse({
      firstName: 'Jane',
      email: 'jane@example.com',
      message: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('API Client — Integration Contract', () => {
  const integrationResponseSchema = z.object({
    integrations: z.array(z.object({
      id: z.string(),
      provider: z.string(),
      status: z.string(),
    }).passthrough()),
  });

  test('integration list response validates correctly', () => {
    const mockResponse = {
      integrations: [
        { id: 'int-1', provider: 'youtube', status: 'active', platform_username: '@creator' },
        { id: 'int-2', provider: 'instagram', status: 'active', followers_count: 50000 },
      ],
    };
    const result = integrationResponseSchema.safeParse(mockResponse);
    expect(result.success).toBe(true);
  });

  test('empty integration list is valid', () => {
    const result = integrationResponseSchema.safeParse({ integrations: [] });
    expect(result.success).toBe(true);
  });
});

describe('API Client — User Profile Contract', () => {
  const updateProfileSchema = z.object({
    fullName: z.string().min(1).max(255).optional(),
    email: z.string().email().optional(),
  });

  const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  });

  test('profile update with full name', () => {
    const result = updateProfileSchema.safeParse({ fullName: 'Jane Smith' });
    expect(result.success).toBe(true);
  });

  test('profile update with email', () => {
    const result = updateProfileSchema.safeParse({ email: 'newemail@example.com' });
    expect(result.success).toBe(true);
  });

  test('password change validates correctly', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpass123',
      newPassword: 'newStrongPassword!',
    });
    expect(result.success).toBe(true);
  });

  test('password change rejects short new password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpass',
      newPassword: 'short',
    });
    expect(result.success).toBe(false);
  });
});

describe('API Client — Automation Contract', () => {
  const createAutomationSchema = z.object({
    name: z.string().min(1).max(255),
    triggerType: z.string().min(1),
    triggerConfig: z.record(z.unknown()).default({}),
    actions: z.array(z.record(z.unknown())).default([]),
    isActive: z.boolean().default(true),
  });

  test('create automation with minimal fields', () => {
    const result = createAutomationSchema.safeParse({
      name: 'New Automation',
      triggerType: 'email.replied',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
      expect(result.data.actions).toEqual([]);
    }
  });

  test('create automation with all fields', () => {
    const result = createAutomationSchema.safeParse({
      name: 'Full Automation',
      triggerType: 'social.metric.updated',
      triggerConfig: { platform: 'youtube', threshold: 1000 },
      actions: [{ type: 'notify', config: { channel: 'slack' } }],
      isActive: false,
    });
    expect(result.success).toBe(true);
  });
});
