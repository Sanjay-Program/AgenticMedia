import { v4 as uuidv4 } from 'uuid';
import { query } from '@agenticmedia/database';
import { encrypt, decrypt } from '../utils/encryption';

export type IntegrationProvider = 'hubspot' | 'gmail' | 'google' | 'slack';

export interface StoredIntegration {
  id: string;
  organizationId: string;
  userId: string;
  provider: IntegrationProvider;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Stores an OAuth2 token securely using AES-256-GCM encryption.
 * Tokens are encrypted at rest and can only be decrypted with the server's encryption key.
 */
export async function storeOAuthToken(params: {
  organizationId: string;
  userId: string;
  provider: IntegrationProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes?: string[];
}): Promise<string> {
  const { organizationId, userId, provider, accessToken, refreshToken, expiresAt, scopes } = params;

  // Encrypt the tokens using AES-256-GCM
  const encryptedAccess = encrypt(accessToken);
  const encryptedRefresh = refreshToken ? encrypt(refreshToken) : null;

  const id = uuidv4();
  const tokenData = JSON.stringify({
    access: encryptedAccess,
    refresh: encryptedRefresh,
    expiresAt: expiresAt || null,
    scopes: scopes || [],
  });

  // Upsert: update if exists for same org/user/provider, otherwise insert
  await query(
    `INSERT INTO integration_tokens (id, organization_id, user_id, provider, encrypted_token_data, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
     ON CONFLICT (organization_id, user_id, provider)
     DO UPDATE SET encrypted_token_data = $5, is_active = TRUE, updated_at = NOW()`,
    [id, organizationId, userId, provider, tokenData]
  );

  // Log to audit for compliance
  await query(
    `INSERT INTO audit_events (id, organization_id, actor_type, actor_id, action, resource_type, resource_id, metadata)
     VALUES ($1, $2, 'user', $3, 'create', 'integration', $4, $5)`,
    [uuidv4(), organizationId, userId, provider, JSON.stringify({ provider, scopes: scopes || [] })]
  );

  return id;
}

/**
 * Retrieves and decrypts an OAuth2 token for a given integration.
 */
export async function getOAuthToken(params: {
  organizationId: string;
  userId: string;
  provider: IntegrationProvider;
}): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: string | null } | null> {
  const result = await query(
    `SELECT encrypted_token_data FROM integration_tokens
     WHERE organization_id = $1 AND user_id = $2 AND provider = $3 AND is_active = TRUE`,
    [params.organizationId, params.userId, params.provider]
  );

  if (result.rows.length === 0) return null;

  const tokenData = JSON.parse(result.rows[0].encrypted_token_data);
  const accessToken = decrypt(tokenData.access.encrypted, tokenData.access.iv, tokenData.access.authTag);
  const refreshToken = tokenData.refresh
    ? decrypt(tokenData.refresh.encrypted, tokenData.refresh.iv, tokenData.refresh.authTag)
    : null;

  return {
    accessToken,
    refreshToken,
    expiresAt: tokenData.expiresAt,
  };
}

/**
 * Revokes (soft-deletes) an integration by marking it inactive.
 */
export async function revokeIntegration(params: {
  organizationId: string;
  userId: string;
  provider: IntegrationProvider;
}): Promise<boolean> {
  const result = await query(
    `UPDATE integration_tokens SET is_active = FALSE, updated_at = NOW()
     WHERE organization_id = $1 AND user_id = $2 AND provider = $3 AND is_active = TRUE`,
    [params.organizationId, params.userId, params.provider]
  );

  if (result.rowCount && result.rowCount > 0) {
    await query(
      `INSERT INTO audit_events (id, organization_id, actor_type, actor_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, 'user', $3, 'delete', 'integration', $4, $5)`,
      [uuidv4(), params.organizationId, params.userId, params.provider,
       JSON.stringify({ provider: params.provider, action: 'revoked' })]
    );
    return true;
  }
  return false;
}
