import { v4 as uuidv4 } from 'uuid';
import { query, getClient } from '@agenticmedia/database';
import { config } from '../../config';
import type {
  NegotiatorAgentInput,
  NegotiatorAgentOutput,
  AgentRunStatus,
  TokenUsage,
} from '@agenticmedia/shared-types';

/**
 * System prompt for the Negotiator Agent.
 * It produces strictly JSON-structured counter-offers.
 * Note: The schema uses pseudo-type notation (e.g., "number | null") which GPT models
 * reliably interpret. The response_format: json_object parameter enforces valid JSON output.
 * Compatible with gpt-4o, gpt-4-turbo, and gpt-3.5-turbo-1106+.
 */
const NEGOTIATOR_SYSTEM_PROMPT = `You are an expert talent-agency negotiator AI. You analyze inbound brand emails and produce structured counter-offers for creator sponsorship deals.

You MUST respond ONLY with valid JSON matching this exact schema:
{
  "suggestedReply": "string - the professional email reply to send",
  "counterOfferAmount": number | null,
  "sentiment": "positive" | "neutral" | "negative" | "interested",
  "shouldEscalateToHuman": boolean,
  "reasoning": "string - internal reasoning for audit trail"
}

Rules:
- Never accept a deal below the creator's minimum CPM.
- If the offer is within 10% of the minimum CPM, counter at the minimum.
- If the offer is significantly below, politely decline or counter at 1.5x minimum.
- If terms are unclear, set shouldEscalateToHuman to true.
- Always be professional and friendly in suggestedReply.`;

/**
 * Builds the user prompt from the negotiator input context.
 */
function buildUserPrompt(input: NegotiatorAgentInput, creatorMinCPM: number | null): string {
  const parts = [
    `Inbound email body:\n"""${input.inboundBody}"""`,
    `Creator ID: ${input.creatorId}`,
  ];

  if (creatorMinCPM !== null) {
    parts.push(`Creator's minimum CPM: $${creatorMinCPM.toFixed(2)}`);
  }
  if (input.historicalCPM !== undefined) {
    parts.push(`Historical CPM for similar deals: $${input.historicalCPM.toFixed(2)}`);
  }
  if (input.campaignBudgetRange) {
    parts.push(`Campaign budget range: $${input.campaignBudgetRange.min} - $${input.campaignBudgetRange.max}`);
  }

  return parts.join('\n');
}

/**
 * Queries the database for the creator's minimum CPM from their discovery metrics.
 */
async function getCreatorMinCPM(creatorId: string): Promise<number | null> {
  const result = await query(
    `SELECT dm.predicted_roi
     FROM discovery_metrics dm
     JOIN creator_platforms cp ON cp.id = dm.creator_platform_id
     WHERE cp.creator_id = $1
     ORDER BY dm.snapshot_date DESC
     LIMIT 1`,
    [creatorId]
  );
  if (result.rows.length > 0 && result.rows[0].predicted_roi !== null) {
    return parseFloat(result.rows[0].predicted_roi);
  }
  return null;
}

/**
 * Creates an agent_run record to track the LLM invocation.
 */
async function createAgentRun(
  input: NegotiatorAgentInput,
  idempotencyKey: string
): Promise<string> {
  const runId = uuidv4();
  await query(
    `INSERT INTO agent_runs (id, organization_id, agent_type, status, input_data, llm_model, idempotency_key, started_at)
     VALUES ($1, $2, 'negotiator', 'running', $3, $4, $5, NOW())`,
    [
      runId,
      input.organizationId,
      JSON.stringify(input),
      config.DEFAULT_LLM_MODEL,
      idempotencyKey,
    ]
  );
  return runId;
}

/**
 * Updates the agent_run record with results and token usage.
 */
async function completeAgentRun(
  runId: string,
  status: AgentRunStatus,
  outputData: Record<string, unknown> | null,
  tokenUsage: TokenUsage,
  errorMessage?: string
): Promise<void> {
  await query(
    `UPDATE agent_runs
     SET status = $1, output_data = $2, token_usage = $3, error_message = $4, completed_at = NOW()
     WHERE id = $5`,
    [
      status,
      outputData ? JSON.stringify(outputData) : null,
      JSON.stringify(tokenUsage),
      errorMessage || null,
      runId,
    ]
  );
}

/**
 * Calls the OpenAI-compatible chat completions API.
 * Uses native fetch to avoid adding a heavy SDK dependency.
 */
async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  model: string
): Promise<{ content: string; tokenUsage: TokenUsage }> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };

  const content = data.choices?.[0]?.message?.content || '';
  const tokenUsage: TokenUsage = {
    promptTokens: data.usage?.prompt_tokens,
    completionTokens: data.usage?.completion_tokens,
    totalTokens: data.usage?.total_tokens,
  };

  return { content, tokenUsage };
}

/**
 * Parses and validates the LLM response as NegotiatorAgentOutput.
 */
function parseNegotiatorOutput(raw: string): NegotiatorAgentOutput {
  const parsed = JSON.parse(raw);

  // Validate required fields
  if (typeof parsed.suggestedReply !== 'string') {
    throw new Error('Missing or invalid suggestedReply in LLM response');
  }
  if (!['positive', 'neutral', 'negative', 'interested'].includes(parsed.sentiment)) {
    throw new Error(`Invalid sentiment: ${parsed.sentiment}`);
  }
  if (typeof parsed.shouldEscalateToHuman !== 'boolean') {
    throw new Error('Missing or invalid shouldEscalateToHuman in LLM response');
  }
  if (typeof parsed.reasoning !== 'string') {
    throw new Error('Missing or invalid reasoning in LLM response');
  }

  return {
    suggestedReply: parsed.suggestedReply,
    counterOfferAmount: typeof parsed.counterOfferAmount === 'number' ? parsed.counterOfferAmount : null,
    sentiment: parsed.sentiment,
    shouldEscalateToHuman: parsed.shouldEscalateToHuman,
    reasoning: parsed.reasoning,
  };
}

/**
 * Main entry point: runs the Negotiator Agent.
 *
 * 1. Checks idempotency (won't re-run for same key)
 * 2. Queries DB for creator's minimum CPM
 * 3. Calls LLM to generate a structured counter-offer
 * 4. Logs token usage to agent_runs for billing
 * 5. Returns the structured output
 *
 * @param input - The negotiation context
 * @param idempotencyKey - Unique key to prevent duplicate runs
 */
export async function runNegotiatorAgent(
  input: NegotiatorAgentInput,
  idempotencyKey: string
): Promise<NegotiatorAgentOutput> {
  // Idempotency: return existing result if already ran
  const existing = await query(
    `SELECT output_data FROM agent_runs WHERE idempotency_key = $1 AND status = 'completed'`,
    [idempotencyKey]
  );
  if (existing.rows.length > 0 && existing.rows[0].output_data) {
    return existing.rows[0].output_data as NegotiatorAgentOutput;
  }

  const runId = await createAgentRun(input, idempotencyKey);

  try {
    // Query the creator's minimum CPM from the database
    const creatorMinCPM = await getCreatorMinCPM(input.creatorId);

    // Build prompts
    const userPrompt = buildUserPrompt(input, creatorMinCPM);

    // Call the LLM
    const { content, tokenUsage } = await callLLM(
      NEGOTIATOR_SYSTEM_PROMPT,
      userPrompt,
      config.DEFAULT_LLM_MODEL
    );

    // Parse the structured output
    const output = parseNegotiatorOutput(content);

    // Persist success
    await completeAgentRun(runId, 'completed', output as unknown as Record<string, unknown>, tokenUsage);

    return output;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await completeAgentRun(runId, 'failed', null, {}, errorMessage);
    throw err;
  }
}
