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
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
