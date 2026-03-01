import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { config } from '../config';
import { storeOAuthToken, revokeIntegration } from '../services/oauth-store';
import type { IntegrationProvider } from '../services/oauth-store';
import { query } from '@agenticmedia/database';
import { INTEGRATION_REGISTRY } from '@agenticmedia/shared-types';

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
      `SELECT id, provider, category, platform_user_id, platform_username, display_name,
              profile_url, followers_count, scopes, status, is_active,
              last_synced_at, created_at, updated_at
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
 * /api/integrations/registry:
 *   get:
 *     tags: [Integrations]
 *     summary: Get the full list of supported integrations and their metadata
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Integration registry with available providers
 */
integrationsRouter.get('/registry', (_req: Request, res: Response) => {
  res.json({ integrations: INTEGRATION_REGISTRY });
});

/**
 * @openapi
 * /api/integrations/social:
 *   get:
 *     tags: [Integrations]
 *     summary: List connected social media accounts with platform metrics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Social media connections
 */
integrationsRouter.get('/social', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT id, provider, platform_user_id, platform_username, display_name,
              profile_url, followers_count, scopes, status, is_active,
              last_synced_at, created_at, updated_at
       FROM integration_tokens
       WHERE organization_id = $1 AND user_id = $2 AND category = 'social'
       ORDER BY created_at DESC`,
      [req.user!.organizationId, req.user!.userId]
    );
    res.json({ connections: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/integrations/connect/{provider}:
 *   get:
 *     tags: [Integrations]
 *     summary: Initiate OAuth2 flow for a provider
 *     parameters:
 *       - name: provider
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [hubspot, gmail, youtube, instagram, tiktok, twitter, linkedin, slack]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OAuth2 authorization URL
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

      // The redirect URI points to our API server's callback endpoint
      const apiBaseUrl = `http://localhost:${config.PORT}`;
      const redirectUri = `${apiBaseUrl}/api/integrations/callback/${provider}`;

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
        case 'youtube':
          authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${process.env.GOOGLE_CLIENT_ID || 'placeholder'}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `scope=https://www.googleapis.com/auth/youtube.readonly%20https://www.googleapis.com/auth/yt-analytics.readonly&` +
            `state=${state}&` +
            `access_type=offline&prompt=consent`;
          break;
        case 'instagram':
          authUrl = `https://api.instagram.com/oauth/authorize?` +
            `client_id=${process.env.INSTAGRAM_CLIENT_ID || 'placeholder'}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=user_profile,user_media&` +
            `response_type=code&` +
            `state=${state}`;
          break;
        case 'tiktok':
          authUrl = `https://www.tiktok.com/v2/auth/authorize/?` +
            `client_key=${process.env.TIKTOK_CLIENT_KEY || 'placeholder'}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=user.info.basic,video.list&` +
            `response_type=code&` +
            `state=${state}`;
          break;
        case 'twitter':
          authUrl = `https://twitter.com/i/oauth2/authorize?` +
            `client_id=${process.env.TWITTER_CLIENT_ID || 'placeholder'}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=tweet.read%20users.read%20offline.access&` +
            `response_type=code&` +
            `state=${state}&` +
            `code_challenge=challenge&code_challenge_method=plain`;
          break;
        case 'linkedin':
          authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
            `client_id=${process.env.LINKEDIN_CLIENT_ID || 'placeholder'}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=r_liteprofile%20r_organization_social&` +
            `response_type=code&` +
            `state=${state}`;
          break;
        case 'slack':
          authUrl = `https://slack.com/oauth/v2/authorize?` +
            `client_id=${process.env.SLACK_CLIENT_ID || 'placeholder'}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=chat:write,channels:read&` +
            `state=${state}`;
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
 *           enum: [hubspot, gmail, youtube, instagram, tiktok, twitter, linkedin, slack]
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
 *               platformUserId:
 *                 type: string
 *               platformUsername:
 *                 type: string
 *               displayName:
 *                 type: string
 *               profileUrl:
 *                 type: string
 *               followersCount:
 *                 type: number
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
      const { code, state: stateParam, platformUserId, platformUsername, displayName, profileUrl, followersCount } = req.body;

      if (!code) {
        res.status(400).json({ error: 'Missing authorization code' });
        return;
      }

      // Determine scopes based on provider
      const scopeMap: Record<string, string[]> = {
        gmail: ['gmail.send', 'gmail.readonly'],
        hubspot: ['contacts', 'crm.objects.contacts.read'],
        youtube: ['youtube.readonly', 'yt-analytics.readonly'],
        instagram: ['user_profile', 'user_media'],
        tiktok: ['user.info.basic', 'video.list'],
        twitter: ['tweet.read', 'users.read', 'offline.access'],
        linkedin: ['r_liteprofile', 'r_organization_social'],
        slack: ['chat:write', 'channels:read'],
      };

      // In production: Exchange code for tokens using provider SDK
      // const tokens = await exchangeCodeForTokens(provider, code, redirectUri);

      // Store the token securely (encrypted with AES-256-GCM)
      const integrationId = await storeOAuthToken({
        organizationId: req.user!.organizationId,
        userId: req.user!.userId,
        provider,
        accessToken: code, // In production: tokens.access_token
        refreshToken: stateParam || undefined, // In production: tokens.refresh_token
        scopes: scopeMap[provider] || [],
        platformUserId: platformUserId || undefined,
        platformUsername: platformUsername || undefined,
        displayName: displayName || undefined,
        profileUrl: profileUrl || undefined,
        followersCount: followersCount || undefined,
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
