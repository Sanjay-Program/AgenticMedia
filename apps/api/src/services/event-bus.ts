import { v4 as uuidv4 } from 'uuid';
import { query } from '@agenticmedia/database';
import type { PublishEventInput, DomainEvent, EventType, EventHandler } from '@agenticmedia/shared-types';

// In-memory handler registry (in production, this would be Kafka/RabbitMQ consumers)
const handlerRegistry = new Map<string, Array<EventHandler>>();

/**
 * Publishes a domain event with idempotency support.
 * Events are persisted to the event_log table, then dispatched to registered handlers.
 * If the same idempotencyKey has been used, the event is not re-published.
 */
export async function publishEvent<T extends Record<string, unknown> = Record<string, unknown>>(
  input: PublishEventInput<T>
): Promise<DomainEvent<T> | null> {
  // Idempotency: check if this event was already published
  const existing = await query(
    'SELECT id FROM event_log WHERE idempotency_key = $1',
    [input.idempotencyKey]
  );

  if (existing.rows.length > 0) {
    return null; // Already published
  }

  const eventId = uuidv4();
  await query(
    `INSERT INTO event_log (id, organization_id, event_type, source, payload, status, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
    [
      eventId,
      input.organizationId || null,
      input.eventType,
      input.source,
      JSON.stringify(input.payload),
      input.idempotencyKey,
    ]
  );

  const event: DomainEvent<T> = {
    id: eventId,
    organizationId: input.organizationId || null,
    eventType: input.eventType,
    source: input.source,
    payload: input.payload,
    status: 'pending',
    idempotencyKey: input.idempotencyKey,
    retryCount: 0,
    maxRetries: 3,
    errorMessage: null,
    processedAt: null,
    createdAt: new Date().toISOString(),
  };

  // Dispatch to registered handlers (fire-and-forget in this layer)
  dispatchEvent(event).catch((err) => {
    console.error(`Failed to dispatch event ${eventId}:`, err);
  });

  return event;
}

/**
 * Registers an event handler for a specific event type.
 */
export function registerEventHandler<T = Record<string, unknown>>(handler: EventHandler<T>): void {
  const handlers = handlerRegistry.get(handler.eventType) || [];
  handlers.push(handler as EventHandler);
  handlerRegistry.set(handler.eventType, handlers);
}

/**
 * Dispatches an event to all registered handlers.
 */
async function dispatchEvent(event: DomainEvent): Promise<void> {
  const handlers = handlerRegistry.get(event.eventType) || [];

  try {
    await query(
      `UPDATE event_log SET status = 'processing' WHERE id = $1`,
      [event.id]
    );

    for (const handler of handlers) {
      await handler.handler(event);
    }

    await query(
      `UPDATE event_log SET status = 'delivered', processed_at = NOW() WHERE id = $1`,
      [event.id]
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await query(
      `UPDATE event_log SET status = 'failed', error_message = $1, retry_count = retry_count + 1 WHERE id = $2`,
      [errorMessage, event.id]
    );
    throw err;
  }
}
