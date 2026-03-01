import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { config } from '../config';
import { storeOAuthToken, revokeIntegration } from '../services/oauth-store';
import type { IntegrationProvider } from '../services/oauth-store';
import { query } from '@agenticmedia/database';

export const integrationsRouter = Router();
integrationsRouter.use(authenticate);

/**
 * @openapi
 * /api/integrations:
 *   get:
 *     tags: [Integrations]
 *     summary: List connected integrations for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of integrations
 */
integrationsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT id, provider, is_active, created_at, updated_at
       FROM integration_tokens
       WHERE organization_id = $1 AND user_id = $2`,
      [req.user!.organizationId, req.user!.userId]
    );
    res.json({ integrations: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/integrations/connect/{provider}:
 *   get:
 *     tags: [Integrations]
 *     summary: Initiate OAuth2 flow for a provider (HubSpot, Gmail)
 *     parameters:
 *       - name: provider
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hubspot, gmail]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       302:
 *         description: Redirect to OAuth provider
 */
integrationsRouter.get(
  '/connect/:provider',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = req.params.provider as IntegrationProvider;

      // Build the OAuth2 authorization URL based on provider
      let authUrl: string;
      const state = Buffer.from(JSON.stringify({
        userId: req.user!.userId,
        organizationId: req.user!.organizationId,
        provider,
      })).toString('base64');

      const redirectUri = `${config.FRONTEND_URL}/api/integrations/callback/${provider}`;

      switch (provider) {
        case 'hubspot':
          authUrl = `https://app.hubspot.com/oauth/authorize?` +
            `client_id=${process.env.HUBSPOT_CLIENT_ID || 'placeholder'}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=contacts%20crm.objects.contacts.read&` +
            `state=${state}`;
          break;
        case 'gmail':
          authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${process.env.GOOGLE_CLIENT_ID || 'placeholder'}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `scope=https://www.googleapis.com/auth/gmail.send%20https://www.googleapis.com/auth/gmail.readonly&` +
            `state=${state}&` +
            `access_type=offline&prompt=consent`;
          break;
        default:
          res.status(400).json({ error: `Unsupported provider: ${provider}` });
          return;
      }

      res.json({ authUrl, provider });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /api/integrations/callback/{provider}:
 *   post:
 *     tags: [Integrations]
 *     summary: Handle OAuth2 callback and store encrypted tokens
 *     parameters:
 *       - name: provider
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hubspot, gmail]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               state:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Integration connected successfully
 */
integrationsRouter.post(
  '/callback/:provider',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = req.params.provider as IntegrationProvider;
      const { code, state: stateParam } = req.body;

      if (!code) {
        res.status(400).json({ error: 'Missing authorization code' });
        return;
      }

      // In production: Exchange code for tokens using provider SDK
      // For now, we demonstrate the secure storage flow
      // const tokens = await exchangeCodeForTokens(provider, code, redirectUri);

      // Store the token securely (encrypted with AES-256-GCM)
      const integrationId = await storeOAuthToken({
        organizationId: req.user!.organizationId,
        userId: req.user!.userId,
        provider,
        accessToken: code, // In production: tokens.access_token
        refreshToken: stateParam || undefined, // In production: tokens.refresh_token
        scopes: provider === 'gmail' ? ['gmail.send', 'gmail.readonly'] : ['contacts', 'crm.objects.contacts.read'],
      });

      res.json({ connected: true, provider, integrationId });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /api/integrations/disconnect/{provider}:
 *   delete:
 *     tags: [Integrations]
 *     summary: Disconnect an integration
 *     parameters:
 *       - name: provider
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Integration disconnected
 */
integrationsRouter.delete(
  '/disconnect/:provider',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = req.params.provider as IntegrationProvider;

      const revoked = await revokeIntegration({
        organizationId: req.user!.organizationId,
        userId: req.user!.userId,
        provider,
      });

      if (!revoked) {
        res.status(404).json({ error: 'Integration not found or already disconnected' });
        return;
      }

      res.json({ disconnected: true, provider });
    } catch (err) {
      next(err);
    }
  }
);
