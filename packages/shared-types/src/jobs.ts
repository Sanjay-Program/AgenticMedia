export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface JobLog {
  id: string;
  organizationId: string;
  jobType: string;
  jobId: string;
  status: JobStatus;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface QueueJobData {
  organizationId: string;
  [key: string]: unknown;
}

export interface OutreachJobData extends QueueJobData {
  campaignId: string;
  creatorId: string;
  brandContactId: string;
}

export interface DiscoveryAggregationJobData extends QueueJobData {
  creatorPlatformId: string;
  platform: string;
}

export interface EmailGenerationJobData extends QueueJobData {
  campaignId: string;
  brandContactId: string;
  creatorId: string;
}

export interface PayoutJobData extends QueueJobData {
  smartContractId: string;
  paymentId: string;
}
