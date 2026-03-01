import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@agenticmedia/database';
import type { AuditAction, AuditActorType, CreateAuditEventInput } from '@agenticmedia/shared-types';

/**
 * Records an immutable audit event for SOC-2 Type II compliance.
 * The audit_events table is append-only (UPDATE and DELETE are blocked by DB rules).
 */
export async function recordAuditEvent(input: CreateAuditEventInput): Promise<void> {
  await query(
    `INSERT INTO audit_events (id, organization_id, actor_type, actor_id, action, resource_type, resource_id, metadata, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      uuidv4(),
      input.organizationId,
      input.actorType,
      input.actorId,
      input.action,
      input.resourceType,
      input.resourceId || null,
      JSON.stringify(input.metadata || {}),
      input.ipAddress || null,
      input.userAgent || null,
    ]
  );
}

/**
 * Express middleware that automatically logs audit events for write operations.
 * Attach after authenticate middleware to capture the user context.
 */
export function auditLog(resourceType: string, action: AuditAction) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Capture the original res.json to intercept the response
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown): Response {
      // Only log on successful responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        // Fire and forget — don't block the response
        recordAuditEvent({
          organizationId: req.user.organizationId,
          actorType: 'user',
          actorId: req.user.userId,
          action,
          resourceType,
          resourceId: (req.params.id as string) || undefined,
          metadata: {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }).catch((err) => {
          console.error('Audit log error:', err);
        });
      }

      return originalJson(body);
    };

    next();
  };
}
