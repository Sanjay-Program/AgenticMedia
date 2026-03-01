// Phase 3: AI Agent Swarm Types

export type AgentType = 'scout' | 'negotiator' | 'legal' | 'orchestrator';
export type AgentRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AgentRun {
  id: string;
  organizationId: string;
  agentType: AgentType;
  parentRunId: string | null;
  status: AgentRunStatus;
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown> | null;
  errorMessage: string | null;
  llmModel: string | null;
  tokenUsage: TokenUsage;
  idempotencyKey: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface CreateAgentRunInput {
  organizationId: string;
  agentType: AgentType;
  parentRunId?: string;
  inputData: Record<string, unknown>;
  llmModel?: string;
  idempotencyKey?: string;
}

// Scout Agent: finds viral creators and brand matches
export interface ScoutAgentInput {
  organizationId: string;
  platform?: string;
  minFollowers?: number;
  minEngagementRate?: number;
  targetIndustry?: string;
}

export interface ScoutAgentOutput {
  discoveredCreators: Array<{
    creatorPlatformId: string;
    aiScore: number;
    growthVelocity: number;
    recommendation: string;
  }>;
}

// Negotiator Agent: handles email negotiations
export interface NegotiatorAgentInput {
  organizationId: string;
  emailId: string;
  inboundBody: string;
  creatorId: string;
  historicalCPM?: number;
  campaignBudgetRange?: { min: number; max: number };
}

export interface NegotiatorAgentOutput {
  suggestedReply: string;
  counterOfferAmount: number | null;
  sentiment: 'positive' | 'neutral' | 'negative' | 'interested';
  shouldEscalateToHuman: boolean;
  reasoning: string;
}

// Legal Agent: generates contracts
export interface LegalAgentInput {
  organizationId: string;
  campaignId: string;
  creatorId: string;
  brandContactId: string;
  dealTerms: {
    totalValue: number;
    platformFeePercent: number;
    agencyFeePercent: number;
    creatorPayoutPercent: number;
    deliverables: string[];
    startDate: string;
    endDate: string;
  };
}

export interface LegalAgentOutput {
  contractDraft: string;
  termsJson: Record<string, unknown>;
  requiresReview: boolean;
  docusignEnvelopeId: string | null;
}
