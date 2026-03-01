import { registerEventHandler, publishEvent } from '../event-bus';
import { runNegotiatorAgent } from './negotiator';
import { v4 as uuidv4 } from 'uuid';
import type {
  DomainEvent,
  NegotiatorAgentInput,
  EventType,
} from '@agenticmedia/shared-types';

/**
 * The Agent Orchestrator consumes events from the event-bus and routes them
 * to the appropriate AI agent. It acts as the central coordinator for the swarm.
 *
 * Event routing:
 * - email.replied → Negotiator Agent (handles brand replies)
 * - social.creator.discovered → Scout Agent (evaluates new creators)
 * - contract.signed → Legal Agent (generates contracts)
 */

/**
 * Handles inbound email replies by dispatching to the Negotiator Agent.
 */
async function handleEmailReplied(event: DomainEvent): Promise<void> {
  const payload = event.payload as {
    emailId?: string;
    inboundBody?: string;
    creatorId?: string;
    organizationId?: string;
  };

  if (!payload.emailId || !payload.inboundBody || !payload.creatorId) {
    console.error('Orchestrator: email.replied event missing required fields', event.id);
    return;
  }

  const orgId = payload.organizationId || event.organizationId || '';

  const negotiatorInput: NegotiatorAgentInput = {
    organizationId: orgId,
    emailId: payload.emailId,
    inboundBody: payload.inboundBody,
    creatorId: payload.creatorId,
  };

  const idempotencyKey = `negotiator-${event.idempotencyKey}`;

  try {
    const result = await runNegotiatorAgent(negotiatorInput, idempotencyKey);

    // Publish the agent completion event
    await publishEvent({
      organizationId: orgId,
      eventType: 'agent.run.completed' as EventType,
      source: 'orchestrator',
      payload: {
        agentType: 'negotiator',
        triggerEventId: event.id,
        output: result,
      },
      idempotencyKey: `agent-complete-${idempotencyKey}`,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await publishEvent({
      organizationId: orgId,
      eventType: 'agent.run.failed' as EventType,
      source: 'orchestrator',
      payload: {
        agentType: 'negotiator',
        triggerEventId: event.id,
        error: errorMessage,
      },
      idempotencyKey: `agent-fail-${idempotencyKey}`,
    });
  }
}

/**
 * Handles social creator discovery events.
 * In production this would call the Scout Agent; for now it logs and publishes a completion event.
 */
async function handleCreatorDiscovered(event: DomainEvent): Promise<void> {
  const orgId = event.organizationId || '';

  // Scout Agent placeholder — would evaluate the creator's virality metrics
  console.log(`Orchestrator: Scout Agent triggered for event ${event.id}`);

  await publishEvent({
    organizationId: orgId,
    eventType: 'agent.run.completed' as EventType,
    source: 'orchestrator',
    payload: {
      agentType: 'scout',
      triggerEventId: event.id,
      output: { status: 'evaluated' },
    },
    idempotencyKey: `scout-${event.idempotencyKey}`,
  });
}

/**
 * Handles contract signed events.
 * In production this would call the Legal Agent to generate DocuSign contracts.
 */
async function handleContractSigned(event: DomainEvent): Promise<void> {
  const orgId = event.organizationId || '';

  // Legal Agent placeholder — would generate contracts via DocuSign API
  console.log(`Orchestrator: Legal Agent triggered for event ${event.id}`);

  await publishEvent({
    organizationId: orgId,
    eventType: 'agent.run.completed' as EventType,
    source: 'orchestrator',
    payload: {
      agentType: 'legal',
      triggerEventId: event.id,
      output: { status: 'contract_generated' },
    },
    idempotencyKey: `legal-${event.idempotencyKey}`,
  });
}

/**
 * Registers all orchestrator event handlers with the event bus.
 * Call this at application startup to wire up the AI swarm.
 */
export function initializeOrchestrator(): void {
  registerEventHandler({
    eventType: 'email.replied',
    handler: handleEmailReplied,
  });

  registerEventHandler({
    eventType: 'social.creator.discovered',
    handler: handleCreatorDiscovered,
  });

  registerEventHandler({
    eventType: 'contract.signed',
    handler: handleContractSigned,
  });

  console.log('Agent Orchestrator initialized — listening for events');
}
