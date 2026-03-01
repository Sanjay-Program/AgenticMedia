import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AgenticMedia API',
      version: '1.0.0',
      description:
        'Enterprise API for the AgenticMedia autonomous media, CRM, and fintech platform. ' +
        'Handles creator management, AI-powered deal negotiation, double-entry accounting, ' +
        'and webhook ingestion for Stripe, Meta, YouTube, and Gmail.',
      contact: {
        name: 'AgenticMedia Engineering',
      },
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Development' },
      { url: 'https://api.agenticmedia.com', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from /api/auth/login or /api/auth/register',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        TokenPair: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            fullName: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'talent_manager', 'data_analyst', 'client_readonly'] },
            organizationId: { type: 'string', format: 'uuid' },
          },
        },
        LedgerTransaction: {
          type: 'object',
          properties: {
            transactionId: { type: 'string', format: 'uuid' },
            entries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  entryType: { type: 'string', enum: ['debit', 'credit'] },
                  amount: { type: 'number' },
                },
              },
            },
          },
        },
        Campaign: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            organizationId: { type: 'string', format: 'uuid' },
            creatorId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            status: { type: 'string', enum: ['negotiating', 'active', 'completed', 'cancelled'] },
            totalValue: { type: 'number' },
            currency: { type: 'string', default: 'USD' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/api/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Register a new organization and admin user',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'fullName', 'organizationName'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    fullName: { type: 'string' },
                    organizationName: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'User registered successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      user: { $ref: '#/components/schemas/User' },
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                    },
                  },
                },
              },
            },
            '409': { description: 'Email already registered' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Authenticate and receive JWT tokens',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      user: { $ref: '#/components/schemas/User' },
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                    },
                  },
                },
              },
            },
            '401': { description: 'Invalid credentials' },
          },
        },
      },
      '/api/auth/refresh': {
        post: {
          tags: ['Authentication'],
          summary: 'Refresh access token using a refresh token',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: {
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Tokens refreshed',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/TokenPair' },
                },
              },
            },
            '401': { description: 'Invalid or expired refresh token' },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Authentication'],
          summary: 'Get the currently authenticated user profile',
          responses: {
            '200': {
              description: 'Current user profile',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      user: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
            '401': { description: 'Not authenticated' },
          },
        },
      },
      '/api/fintech/campaigns': {
        get: {
          tags: ['Fintech'],
          summary: 'List all campaigns for the authenticated organization',
          responses: {
            '200': {
              description: 'List of campaigns',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      campaigns: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Campaign' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Fintech'],
          summary: 'Create a new campaign deal',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['creatorId', 'name', 'totalValue'],
                  properties: {
                    creatorId: { type: 'string', format: 'uuid' },
                    brandContactId: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    totalValue: { type: 'number', minimum: 0 },
                    currency: { type: 'string', default: 'USD' },
                    startDate: { type: 'string', format: 'date' },
                    endDate: { type: 'string', format: 'date' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Campaign created' },
            '403': { description: 'Insufficient permissions' },
          },
        },
      },
      '/api/fintech/contracts': {
        post: {
          tags: ['Fintech'],
          summary: 'Create a smart contract for a campaign',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['campaignId', 'terms'],
                  properties: {
                    campaignId: { type: 'string', format: 'uuid' },
                    terms: { type: 'object' },
                    platformFeePercent: { type: 'number', default: 2 },
                    agencyFeePercent: { type: 'number', default: 15 },
                    creatorPayoutPercent: { type: 'number', default: 83 },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Contract created' },
            '400': { description: 'Fee percentages must sum to 100' },
          },
        },
      },
      '/api/fintech/contracts/{id}/process-payment': {
        post: {
          tags: ['Fintech'],
          summary: 'Process payment and create revenue splits for a contract',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'Smart contract ID',
            },
          ],
          responses: {
            '200': {
              description: 'Revenue splits created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      splits: { type: 'array', items: { type: 'object' } },
                      breakdown: {
                        type: 'object',
                        properties: {
                          total: { type: 'number' },
                          platform: { type: 'number' },
                          agency: { type: 'number' },
                          creator: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': { description: 'Contract must be active' },
            '404': { description: 'Contract not found' },
          },
        },
      },
      '/api/webhooks/email-reply': {
        post: {
          tags: ['Webhooks'],
          summary: 'Receive inbound email reply webhook',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['emailId', 'rawBody'],
                  properties: {
                    emailId: { type: 'string', format: 'uuid' },
                    rawBody: { type: 'string' },
                    sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative', 'interested'] },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Reply received and stored' },
          },
        },
      },
      '/api/webhooks/stripe': {
        post: {
          tags: ['Webhooks'],
          summary: 'Handle Stripe webhook events',
          security: [],
          description: 'Processes Stripe events including checkout.session.completed, account.updated, payment_intent.succeeded, transfer.paid, and transfer.failed. Split payments are automatically routed through the double-entry ledger.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    data: { type: 'object' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Webhook processed' },
          },
        },
      },
      '/api/integrations': {
        get: {
          tags: ['Integrations'],
          summary: 'List connected integrations for the current user',
          responses: {
            '200': {
              description: 'List of integrations',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      integrations: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            provider: { type: 'string', enum: ['hubspot', 'gmail', 'youtube', 'instagram', 'tiktok', 'twitter', 'linkedin', 'slack', 'google'] },
                            category: { type: 'string', enum: ['social', 'crm', 'email', 'messaging'] },
                            platformUsername: { type: 'string' },
                            displayName: { type: 'string' },
                            followersCount: { type: 'number' },
                            status: { type: 'string', enum: ['connected', 'disconnected', 'expired', 'error'] },
                            isActive: { type: 'boolean' },
                            createdAt: { type: 'string', format: 'date-time' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/integrations/registry': {
        get: {
          tags: ['Integrations'],
          summary: 'Get the full list of supported integrations and their metadata',
          responses: {
            '200': {
              description: 'Integration registry',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      integrations: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            provider: { type: 'string' },
                            category: { type: 'string' },
                            name: { type: 'string' },
                            description: { type: 'string' },
                            icon: { type: 'string' },
                            scopes: { type: 'array', items: { type: 'string' } },
                            features: { type: 'array', items: { type: 'string' } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/integrations/social': {
        get: {
          tags: ['Integrations'],
          summary: 'List connected social media accounts with platform metrics',
          responses: {
            '200': {
              description: 'Social media connections',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      connections: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            provider: { type: 'string', enum: ['youtube', 'instagram', 'tiktok', 'twitter', 'linkedin'] },
                            platformUsername: { type: 'string' },
                            displayName: { type: 'string' },
                            followersCount: { type: 'number' },
                            status: { type: 'string' },
                            lastSyncedAt: { type: 'string', format: 'date-time' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/integrations/connect/{provider}': {
        get: {
          tags: ['Integrations'],
          summary: 'Initiate OAuth2 flow for a provider',
          parameters: [
            {
              name: 'provider',
              in: 'path',
              required: true,
              schema: { type: 'string', enum: ['hubspot', 'gmail', 'youtube', 'instagram', 'tiktok', 'twitter', 'linkedin', 'slack'] },
              description: 'OAuth2 provider name',
            },
          ],
          responses: {
            '200': {
              description: 'OAuth2 authorization URL',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      authUrl: { type: 'string', format: 'uri' },
                      provider: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/integrations/callback/{provider}': {
        post: {
          tags: ['Integrations'],
          summary: 'Handle OAuth2 callback and store encrypted tokens',
          parameters: [
            {
              name: 'provider',
              in: 'path',
              required: true,
              schema: { type: 'string', enum: ['hubspot', 'gmail', 'youtube', 'instagram', 'tiktok', 'twitter', 'linkedin', 'slack'] },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['code'],
                  properties: {
                    code: { type: 'string' },
                    state: { type: 'string' },
                    platformUserId: { type: 'string' },
                    platformUsername: { type: 'string' },
                    displayName: { type: 'string' },
                    profileUrl: { type: 'string' },
                    followersCount: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Integration connected successfully' },
          },
        },
      },
      '/api/integrations/disconnect/{provider}': {
        delete: {
          tags: ['Integrations'],
          summary: 'Disconnect an integration',
          parameters: [
            {
              name: 'provider',
              in: 'path',
              required: true,
              schema: { type: 'string', enum: ['hubspot', 'gmail', 'youtube', 'instagram', 'tiktok', 'twitter', 'linkedin', 'slack'] },
            },
          ],
          responses: {
            '200': { description: 'Integration disconnected' },
            '404': { description: 'Integration not found' },
          },
        },
      },
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Health check endpoint',
          security: [],
          responses: {
            '200': {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/dashboard/stats': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get dashboard KPI stats for the current organization',
          responses: {
            '200': { description: 'Dashboard stats including GMV, deals, creators, agent runs' },
          },
        },
      },
      '/api/dashboard/activity': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get recent activity feed for the organization',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'number', default: 20 } },
          ],
          responses: {
            '200': { description: 'Recent audit events' },
          },
        },
      },
      '/api/agents/runs': {
        get: {
          tags: ['AI Agents'],
          summary: 'List agent runs with optional filtering',
          parameters: [
            { name: 'agentType', in: 'query', schema: { type: 'string', enum: ['scout', 'negotiator', 'legal', 'orchestrator'] } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] } },
            { name: 'page', in: 'query', schema: { type: 'number', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'number', default: 20 } },
          ],
          responses: {
            '200': { description: 'Paginated list of agent runs' },
          },
        },
      },
      '/api/agents/runs/{id}': {
        get: {
          tags: ['AI Agents'],
          summary: 'Get a single agent run by ID',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'Agent run details' },
            '404': { description: 'Agent run not found' },
          },
        },
      },
      '/api/agents/stats': {
        get: {
          tags: ['AI Agents'],
          summary: 'Get agent usage stats for the organization',
          responses: {
            '200': { description: 'Agent runs grouped by type, status, and total tokens used' },
          },
        },
      },
      '/api/automations': {
        get: {
          tags: ['Automations'],
          summary: 'List automation workflows',
          responses: { '200': { description: 'List of automation workflows' } },
        },
        post: {
          tags: ['Automations'],
          summary: 'Create a new automation workflow',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'triggerType'],
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    triggerType: { type: 'string' },
                    triggerConfig: { type: 'object' },
                    actions: { type: 'array', items: { type: 'object' } },
                    isActive: { type: 'boolean', default: true },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Automation created' } },
        },
      },
      '/api/automations/{id}': {
        get: {
          tags: ['Automations'],
          summary: 'Get a single automation workflow',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Automation details' }, '404': { description: 'Not found' } },
        },
        patch: {
          tags: ['Automations'],
          summary: 'Update an automation workflow',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Automation updated' }, '404': { description: 'Not found' } },
        },
        delete: {
          tags: ['Automations'],
          summary: 'Delete an automation workflow',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Automation deleted' }, '404': { description: 'Not found' } },
        },
      },
      '/api/automations/{id}/toggle': {
        post: {
          tags: ['Automations'],
          summary: 'Toggle automation active/inactive',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Automation toggled' } },
        },
      },
      '/api/users/team': {
        get: {
          tags: ['Users'],
          summary: 'List team members in the organization',
          responses: { '200': { description: 'List of team members' } },
        },
      },
      '/api/users/profile': {
        patch: {
          tags: ['Users'],
          summary: 'Update the current user profile',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    fullName: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Profile updated' } },
        },
      },
      '/api/users/change-password': {
        post: {
          tags: ['Users'],
          summary: 'Change the current user password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['currentPassword', 'newPassword'],
                  properties: {
                    currentPassword: { type: 'string' },
                    newPassword: { type: 'string', minLength: 8 },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Password changed' }, '401': { description: 'Wrong current password' } },
        },
      },
      '/api/users/invite': {
        post: {
          tags: ['Users'],
          summary: 'Invite a new team member (admin only)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'fullName', 'role'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    fullName: { type: 'string' },
                    role: { type: 'string', enum: ['admin', 'talent_manager', 'data_analyst', 'client_readonly'] },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'User invited' }, '409': { description: 'Email already registered' } },
        },
      },
      '/api/users/{id}/role': {
        patch: {
          tags: ['Users'],
          summary: 'Update a team member role (admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Role updated' } },
        },
      },
      '/api/users/{id}/deactivate': {
        post: {
          tags: ['Users'],
          summary: 'Deactivate a team member (admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'User deactivated' } },
        },
      },
      '/api/users/{id}/reactivate': {
        post: {
          tags: ['Users'],
          summary: 'Reactivate a team member (admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'User reactivated' } },
        },
      },
      '/api/organizations/current': {
        get: {
          tags: ['Organizations'],
          summary: 'Get the current organization details',
          responses: { '200': { description: 'Organization details with member count' } },
        },
        patch: {
          tags: ['Organizations'],
          summary: 'Update organization settings (admin only)',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    customDomain: { type: 'string' },
                    brandingConfig: { type: 'object' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Organization updated' } },
        },
      },
      '/api/organizations/billing': {
        get: {
          tags: ['Organizations'],
          summary: 'Get organization billing summary',
          responses: { '200': { description: 'Billing summary with plan tier, ledger accounts, and revenue splits' } },
        },
      },
      '/api/audit/events': {
        get: {
          tags: ['Audit'],
          summary: 'List audit events (admin/data_analyst only)',
          parameters: [
            { name: 'action', in: 'query', schema: { type: 'string' } },
            { name: 'resourceType', in: 'query', schema: { type: 'string' } },
            { name: 'actorType', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'number', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'number', default: 50 } },
          ],
          responses: { '200': { description: 'Paginated audit events' } },
        },
      },
      '/api/audit/summary': {
        get: {
          tags: ['Audit'],
          summary: 'Get audit summary stats (admin/data_analyst only)',
          responses: { '200': { description: 'Audit stats by action, resource type, and actor type' } },
        },
      },
      '/api/ledger/accounts': {
        get: {
          tags: ['Ledger'],
          summary: 'List ledger accounts for the organization',
          responses: { '200': { description: 'List of ledger accounts with balances' } },
        },
      },
      '/api/ledger/accounts/initialize': {
        post: {
          tags: ['Ledger'],
          summary: 'Initialize system ledger accounts (idempotent, admin only)',
          responses: { '200': { description: 'System accounts initialized' } },
        },
      },
      '/api/ledger/transactions': {
        get: {
          tags: ['Ledger'],
          summary: 'List financial transactions with entries',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'posted', 'reversed', 'failed'] } },
            { name: 'page', in: 'query', schema: { type: 'number', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'number', default: 20 } },
          ],
          responses: { '200': { description: 'Paginated list of transactions with entries' } },
        },
      },
      '/api/ledger/balance': {
        get: {
          tags: ['Ledger'],
          summary: 'Get balance summary grouped by account type',
          responses: { '200': { description: 'Account balances by type' } },
        },
      },
      '/api/ledger/balance-check': {
        get: {
          tags: ['Ledger'],
          summary: 'Verify double-entry balance integrity (admin/data_analyst only)',
          responses: { '200': { description: 'Balance check results with health status' } },
        },
      },
      '/api/fintech/campaigns/{id}': {
        get: {
          tags: ['Fintech'],
          summary: 'Get a single campaign with contract details',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Campaign details' }, '404': { description: 'Not found' } },
        },
        patch: {
          tags: ['Fintech'],
          summary: 'Update campaign status or details',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Campaign updated' }, '404': { description: 'Not found' } },
        },
      },
      '/api/fintech/contracts/{id}/activate': {
        post: {
          tags: ['Fintech'],
          summary: 'Activate a draft contract (admin only)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Contract activated' }, '404': { description: 'Not found or not draft' } },
        },
      },
      '/api/creators/{id}': {
        patch: {
          tags: ['Creators'],
          summary: 'Update a creator',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Creator updated' }, '404': { description: 'Not found' } },
        },
        delete: {
          tags: ['Creators'],
          summary: 'Delete a creator',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Creator deleted' }, '404': { description: 'Not found' } },
        },
      },

      // ===== Module 1: Predictive Scouting Engine =====
      '/api/scout/trending': {
        get: {
          tags: ['Scout Engine'],
          summary: 'Get trending creators with velocity scores',
          description: 'Returns up to 50 creators ranked by growth velocity and AI score.',
          responses: { '200': { description: 'Trending creators list' } },
        },
      },
      '/api/scout/alerts': {
        get: {
          tags: ['Scout Engine'],
          summary: 'Get breakout alerts',
          description: 'Returns recent breakout detection alerts from the scouting engine.',
          responses: { '200': { description: 'Scout alerts list' } },
        },
      },
      '/api/scout/ingest': {
        post: {
          tags: ['Scout Engine'],
          summary: 'Ingest social metrics and calculate velocity score',
          description: 'Called by scraper workers to feed real-time social metrics. Returns the calculated velocity score.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['creatorPlatformId', 'platform', 'recentVideos', 'historicalAvgViews', 'historicalAvgEngagement', 'followersCount'],
                  properties: {
                    creatorPlatformId: { type: 'string', format: 'uuid' },
                    platform: { type: 'string' },
                    recentVideos: { type: 'array', items: { type: 'object' } },
                    historicalAvgViews: { type: 'number' },
                    historicalAvgEngagement: { type: 'number' },
                    followersCount: { type: 'integer' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Velocity score calculated' } },
        },
      },
      '/api/scout/batch': {
        post: {
          tags: ['Scout Engine'],
          summary: 'Queue batch of creators for background scouting',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['creatorPlatformIds'],
                  properties: {
                    creatorPlatformIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Batch queued' } },
        },
      },
      '/api/scout/velocity/{creatorPlatformId}': {
        get: {
          tags: ['Scout Engine'],
          summary: 'Get velocity score for a single creator',
          parameters: [{ name: 'creatorPlatformId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Velocity score' } },
        },
      },

      // ===== Module 2: Ghost Negotiator =====
      '/api/agents/negotiate/approve': {
        post: {
          tags: ['Ghost Negotiator'],
          summary: 'Approve or reject an AI-drafted counter-offer',
          description: 'Human-in-the-loop approval for negotiator agent draft emails.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['agentRunId', 'approved'],
                  properties: {
                    agentRunId: { type: 'string', format: 'uuid' },
                    approved: { type: 'boolean' },
                    editedReply: { type: 'string', description: 'Optional edited reply text' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Approval processed' } },
        },
      },

      // ===== Module 4: Agency Command Center - Branding =====
      '/api/branding': {
        get: {
          tags: ['Agency Command Center'],
          summary: 'Get current white-label branding configuration',
          responses: { '200': { description: 'Branding config' } },
        },
        patch: {
          tags: ['Agency Command Center'],
          summary: 'Update white-label branding (admin only)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    logoUrl: { type: 'string', format: 'uri' },
                    primaryColor: { type: 'string', pattern: '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$' },
                    accentColor: { type: 'string', pattern: '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$' },
                    backgroundColor: { type: 'string', pattern: '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$' },
                    companyName: { type: 'string' },
                    fontFamily: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Branding updated' } },
        },
      },
      '/api/branding/theme.css': {
        get: {
          tags: ['Agency Command Center'],
          summary: 'Get CSS variables for white-label theming',
          responses: { '200': { description: 'CSS variables', content: { 'text/css': {} } } },
        },
      },

      // ===== Module 5/6: NeuraForge Video Engine =====
      '/api/video/jobs': {
        post: {
          tags: ['Video Engine'],
          summary: 'Create a video processing job',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['jobType', 'sourceFileKey'],
                  properties: {
                    jobType: { type: 'string', enum: ['transcribe', 'caption_render', 'clip_extract', 'format_adapt'] },
                    sourceFileKey: { type: 'string' },
                    targetPlatforms: { type: 'array', items: { type: 'string', enum: ['tiktok', 'youtube_shorts', 'instagram_reels', 'linkedin', 'youtube'] } },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Job created and queued' } },
        },
        get: {
          tags: ['Video Engine'],
          summary: 'List video processing jobs',
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'jobType', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: { '200': { description: 'Video jobs list' } },
        },
      },
      '/api/video/jobs/{id}': {
        get: {
          tags: ['Video Engine'],
          summary: 'Get a single video job',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Video job details' }, '404': { description: 'Not found' } },
        },
      },
      '/api/video/jobs/{id}/assets': {
        get: {
          tags: ['Video Engine'],
          summary: 'Get content assets for a video job (multi-platform adaptations)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Content assets list' } },
        },
      },
      '/api/video/upload-url': {
        post: {
          tags: ['Video Engine'],
          summary: 'Generate a presigned upload URL for direct-to-cloud video upload',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['fileName', 'contentType'],
                  properties: {
                    fileName: { type: 'string' },
                    contentType: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Presigned URL generated' } },
        },
      },

      // ===== Module 7: Crisis Shield - Sentiment Engine =====
      '/api/sentiment/analyze': {
        post: {
          tags: ['Crisis Shield'],
          summary: 'Analyze a batch of comments for sentiment and crisis detection',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['creatorPlatformId', 'platform', 'comments'],
                  properties: {
                    creatorPlatformId: { type: 'string', format: 'uuid' },
                    platform: { type: 'string' },
                    comments: { type: 'array', items: { type: 'object', properties: { sourceType: { type: 'string' }, sourceId: { type: 'string' }, text: { type: 'string' } } } },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Sentiment window with crisis level' } },
        },
      },
      '/api/sentiment/classify': {
        post: {
          tags: ['Crisis Shield'],
          summary: 'Classify a single text for sentiment (synchronous)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['text'],
                  properties: {
                    text: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Sentiment classification result' } },
        },
      },
      '/api/sentiment/alerts': {
        get: {
          tags: ['Crisis Shield'],
          summary: 'Get crisis alerts for the organization',
          responses: { '200': { description: 'Crisis alerts list' } },
        },
      },
      '/api/sentiment/webhook/comments': {
        post: {
          tags: ['Crisis Shield'],
          summary: 'Webhook endpoint for incoming social comments (queued for analysis)',
          security: [],
          responses: { '200': { description: 'Comments queued for analysis' } },
        },
      },

      // ──────────────────────────────────────────────────────────────
      // Enterprise V2 — Credit Score, CPM, Compliance
      // ──────────────────────────────────────────────────────────────
      '/api/enterprise/creators/{id}/credit-score': {
        get: {
          tags: ['Enterprise'],
          summary: 'Calculate Creator Credit Score',
          description: 'Returns an AI-powered credit score with fraud signals for a creator, similar to a FICO score for the creator economy.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': { description: 'Credit score with components and fraud signals' },
            '404': { description: 'Creator not found' },
          },
        },
      },
      '/api/enterprise/cpm-estimate': {
        post: {
          tags: ['Enterprise'],
          summary: 'Dynamic CPM Estimate',
          description: 'Calculates a dynamic CPM (Cost Per Mille) adjusted for seasonality, industry demand, engagement quality, and conversion potential.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['creatorId', 'platform'],
                  properties: {
                    creatorId: { type: 'string', format: 'uuid' },
                    platform: { type: 'string' },
                    industry: { type: 'string' },
                    brandAvgBudget: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Dynamic CPM estimate with adjustment factors' },
          },
        },
      },
      '/api/enterprise/compliance/status': {
        get: {
          tags: ['Enterprise'],
          summary: 'Compliance Status',
          description: 'Returns SOC 2, GDPR, and other compliance framework status for the organization.',
          responses: {
            '200': { description: 'Compliance framework status with control details' },
          },
        },
      },
      '/api/enterprise/compliance/audit-export': {
        post: {
          tags: ['Enterprise'],
          summary: 'Generate Audit Export',
          description: 'Generates a downloadable audit export for a specified date range (JSON/CSV/PDF).',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['startDate', 'endDate'],
                  properties: {
                    startDate: { type: 'string', format: 'date-time' },
                    endDate: { type: 'string', format: 'date-time' },
                    exportType: { type: 'string', enum: ['full', 'financial', 'access', 'data_processing'] },
                    format: { type: 'string', enum: ['json', 'csv', 'pdf'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Audit export metadata with download URL' },
          },
        },
      },
      '/api/enterprise/tax/withholding-rate': {
        get: {
          tags: ['Enterprise'],
          summary: 'Tax Withholding Rate',
          description: 'Returns withholding tax and VAT rates for a given country code.',
          parameters: [{ name: 'country', in: 'query', required: false, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Tax rates for the specified country' },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
