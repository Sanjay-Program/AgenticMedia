import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from '../config';
import { registerEventHandler } from './event-bus';
import type { DomainEvent, EventType } from '@agenticmedia/shared-types';

let io: SocketIOServer | null = null;

/**
 * Initializes Socket.io server for real-time event streaming to the frontend.
 * Connects to the event bus so agent completions, payment events, and
 * other domain events are pushed to connected clients in real-time.
 */
export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.FRONTEND_URL,
      credentials: true,
    },
    path: '/ws',
  });

  io.on('connection', (socket) => {
    console.log(`WebSocket client connected: ${socket.id}`);

    // Allow clients to join their organization room for scoped events
    socket.on('join:org', (organizationId: string) => {
      socket.join(`org:${organizationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`WebSocket client disconnected: ${socket.id}`);
    });
  });

  // Register event bus handlers that broadcast to connected clients
  const eventsToBroadcast: EventType[] = [
    'agent.run.started',
    'agent.run.completed',
    'agent.run.failed',
    'payment.succeeded',
    'payment.failed',
    'email.replied',
    'social.creator.discovered',
    'contract.signed',
  ];

  for (const eventType of eventsToBroadcast) {
    registerEventHandler({
      eventType,
      handler: async (event: DomainEvent) => {
        if (!io) return;

        const payload = {
          id: event.id,
          type: event.eventType,
          source: event.source,
          payload: event.payload,
          timestamp: event.createdAt,
        };

        // Broadcast to org room if available, otherwise broadcast globally
        if (event.organizationId) {
          io.to(`org:${event.organizationId}`).emit('domain:event', payload);
        } else {
          io.emit('domain:event', payload);
        }
      },
    });
  }

  console.log('WebSocket server initialized');
  return io;
}

/**
 * Returns the current Socket.io server instance (or null if not initialized).
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Emits an event to a specific organization's room.
 */
export function emitToOrganization(
  organizationId: string,
  event: string,
  data: unknown
): void {
  if (io) {
    io.to(`org:${organizationId}`).emit(event, data);
  }
}
