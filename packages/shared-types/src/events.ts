// Phase 2: Event Broker Types

export type EventStatus = 'pending' | 'processing' | 'delivered' | 'failed' | 'dead_letter';

// Standard event types for the event broker
export type EventType =
  | 'email.received'
  | 'email.sent'
  | 'email.opened'
  | 'email.replied'
  | 'email.bounced'
  | 'social.metric.updated'
  | 'social.creator.discovered'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded'
  | 'contract.signed'
  | 'contract.completed'
  | 'agent.run.started'
  | 'agent.run.completed'
  | 'agent.run.failed'
  | 'webhook.stripe'
  | 'webhook.meta'
  | 'webhook.youtube'
  | 'webhook.gmail';

export interface DomainEvent<T = Record<string, unknown>> {
  id: string;
  organizationId: string | null;
  eventType: EventType;
  source: string;
  payload: T;
  status: EventStatus;
  idempotencyKey: string;
  retryCount: number;
  maxRetries: number;
  errorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface PublishEventInput<T = Record<string, unknown>> {
  organizationId?: string;
  eventType: EventType;
  source: string;
  payload: T;
  idempotencyKey: string;
}

// Event handler registration
export interface EventHandler<T = Record<string, unknown>> {
  eventType: EventType;
  handler: (event: DomainEvent<T>) => Promise<void>;
}

// Webhook payloads from external services
export interface StripeWebhookPayload {
  type: string;
  data: { object: Record<string, unknown> };
}

export interface SocialMetricPayload {
  creatorPlatformId: string;
  platform: string;
  metrics: {
    followersCount?: number;
    engagementRate?: number;
    avgViews?: number;
  };
  scrapedAt: string;
}
