import { Queue, type ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

let connection: IORedis | null = null;

function getRedisConnection(): ConnectionOptions {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
  }
  return connection as ConnectionOptions;
}

let outreachQueue: Queue | null = null;
let discoveryQueue: Queue | null = null;
let payoutQueue: Queue | null = null;

export function getOutreachQueue(): Queue {
  if (!outreachQueue) {
    outreachQueue = new Queue('outreach', { connection: getRedisConnection() });
  }
  return outreachQueue;
}

export function getDiscoveryQueue(): Queue {
  if (!discoveryQueue) {
    discoveryQueue = new Queue('discovery', { connection: getRedisConnection() });
  }
  return discoveryQueue;
}

export function getPayoutQueue(): Queue {
  if (!payoutQueue) {
    payoutQueue = new Queue('payout', { connection: getRedisConnection() });
  }
  return payoutQueue;
}
