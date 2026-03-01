import { Queue } from 'bullmq';

function getRedisOptions() {
  return {
    connection: {
      host: new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname,
      port: Number(new URL(process.env.REDIS_URL || 'redis://localhost:6379').port) || 6379,
    },
  };
}

let outreachQueue: Queue | null = null;
let discoveryQueue: Queue | null = null;
let payoutQueue: Queue | null = null;
let scoutQueue: Queue | null = null;
let videoQueue: Queue | null = null;
let sentimentQueue: Queue | null = null;

export function getOutreachQueue(): Queue {
  if (!outreachQueue) {
    outreachQueue = new Queue('outreach', getRedisOptions());
  }
  return outreachQueue;
}

export function getDiscoveryQueue(): Queue {
  if (!discoveryQueue) {
    discoveryQueue = new Queue('discovery', getRedisOptions());
  }
  return discoveryQueue;
}

export function getPayoutQueue(): Queue {
  if (!payoutQueue) {
    payoutQueue = new Queue('payout', getRedisOptions());
  }
  return payoutQueue;
}

export function getScoutQueue(): Queue {
  if (!scoutQueue) {
    scoutQueue = new Queue('scout', getRedisOptions());
  }
  return scoutQueue;
}

export function getVideoQueue(): Queue {
  if (!videoQueue) {
    videoQueue = new Queue('video', getRedisOptions());
  }
  return videoQueue;
}

export function getSentimentQueue(): Queue {
  if (!sentimentQueue) {
    sentimentQueue = new Queue('sentiment', getRedisOptions());
  }
  return sentimentQueue;
}
