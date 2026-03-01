'use client';

import { useEffect, useState } from 'react';

/**
 * Represents a real-time agent event received via WebSocket.
 */
interface AgentEvent {
  id: string;
  type: string;
  source: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

/**
 * Formats an event type into a human-readable notification message.
 */
function formatEventMessage(event: AgentEvent): string {
  const payload = event.payload;
  switch (event.type) {
    case 'agent.run.completed':
      return `${String(payload.agentType || 'Agent')} completed: ${String(payload.summary || 'Task finished')}`;
    case 'agent.run.failed':
      return `${String(payload.agentType || 'Agent')} failed: ${String(payload.error || 'Unknown error')}`;
    case 'agent.run.started':
      return `${String(payload.agentType || 'Agent')} started processing`;
    case 'payment.succeeded':
      return `Payment of $${payload.totalAmount || '???'} processed successfully`;
    case 'email.replied':
      return `New email reply received`;
    case 'social.creator.discovered':
      return `New creator discovered on ${String(payload.platform || 'social media')}`;
    case 'contract.signed':
      return `Contract signed for campaign`;
    default:
      return `${event.type} from ${event.source}`;
  }
}

/**
 * Returns the appropriate color class for an event type.
 */
function getEventColor(type: string): string {
  if (type.includes('completed') || type.includes('succeeded') || type.includes('signed')) {
    return 'border-green-500/30 bg-green-500/5';
  }
  if (type.includes('failed')) {
    return 'border-red-500/30 bg-red-500/5';
  }
  if (type.includes('started')) {
    return 'border-blue-500/30 bg-blue-500/5';
  }
  return 'border-indigo-500/30 bg-indigo-500/5';
}

/**
 * LiveAgentFeed — Client Component for real-time WebSocket agent event streaming.
 *
 * Connects to the Socket.io server and displays sliding toast notifications
 * as AI agents complete tasks, payments process, and events flow through the system.
 *
 * Falls back to polling if WebSocket is unavailable.
 */
export function LiveAgentFeed({ organizationId }: { organizationId?: string }) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Dynamic import to avoid SSR issues with socket.io-client
    let cleanup: (() => void) | undefined;

    async function connectWebSocket() {
      try {
        const { io } = await import('socket.io-client');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const socket = io(apiUrl, { path: '/ws', transports: ['websocket', 'polling'] });

        socket.on('connect', () => {
          setConnected(true);
          if (organizationId) {
            socket.emit('join:org', organizationId);
          }
        });

        socket.on('disconnect', () => {
          setConnected(false);
        });

        socket.on('domain:event', (event: AgentEvent) => {
          setEvents((prev) => [event, ...prev].slice(0, 50)); // Keep last 50 events
        });

        cleanup = () => {
          socket.disconnect();
        };
      } catch {
        // Socket.io client not available — show static mode
        console.warn('WebSocket connection unavailable, running in static mode');
      }
    }

    connectWebSocket();
    return () => cleanup?.();
  }, [organizationId]);

  return (
    <div className="space-y-3">
      {/* Connection Status */}
      <div className="flex items-center gap-2 text-xs">
        <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-500'}`} />
        <span className={connected ? 'text-green-400' : 'text-gray-500'}>
          {connected ? 'Live' : 'Connecting...'}
        </span>
      </div>

      {/* Event Feed */}
      {events.length === 0 ? (
        <div className="rounded-lg border border-[#1e1e2e] bg-[#111118] px-4 py-8 text-center">
          <p className="text-sm text-gray-500">Waiting for real-time events...</p>
          <p className="mt-1 text-xs text-gray-600">Agent activity will appear here as it happens</p>
        </div>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            className={`rounded-lg border px-4 py-3 transition-all duration-300 ${getEventColor(event.type)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-200">
                  {formatEventMessage(event)}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="rounded bg-[#1e1e2e] px-1.5 py-0.5 text-xs text-indigo-400">
                    {event.type}
                  </code>
                  <span className="text-xs text-gray-500">from {event.source}</span>
                </div>
              </div>
              <span className="whitespace-nowrap text-xs text-gray-600">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
