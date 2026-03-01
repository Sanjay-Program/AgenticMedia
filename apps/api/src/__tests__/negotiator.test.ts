import type { NegotiatorAgentInput, NegotiatorAgentOutput } from '@agenticmedia/shared-types';

/**
 * Pure validation function extracted from the negotiator agent for unit testing.
 * Mirrors the parseNegotiatorOutput logic without requiring DB or LLM calls.
 */
function parseNegotiatorOutput(raw: string): NegotiatorAgentOutput {
  const parsed = JSON.parse(raw);

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
 * Builds the user prompt from input and creator CPM.
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

describe('Negotiator Agent', () => {
  describe('parseNegotiatorOutput', () => {
    it('should parse a valid LLM response', () => {
      const raw = JSON.stringify({
        suggestedReply: 'Thank you for the offer. We would like to counter at $5000.',
        counterOfferAmount: 5000,
        sentiment: 'interested',
        shouldEscalateToHuman: false,
        reasoning: 'The offer is 20% below minimum CPM, countering at minimum.',
      });

      const result = parseNegotiatorOutput(raw);
      expect(result.suggestedReply).toContain('counter at $5000');
      expect(result.counterOfferAmount).toBe(5000);
      expect(result.sentiment).toBe('interested');
      expect(result.shouldEscalateToHuman).toBe(false);
      expect(result.reasoning).toContain('minimum CPM');
    });

    it('should handle null counterOfferAmount', () => {
      const raw = JSON.stringify({
        suggestedReply: 'We are happy to accept the offer.',
        counterOfferAmount: null,
        sentiment: 'positive',
        shouldEscalateToHuman: false,
        reasoning: 'Offer meets minimum CPM requirements.',
      });

      const result = parseNegotiatorOutput(raw);
      expect(result.counterOfferAmount).toBeNull();
    });

    it('should coerce non-numeric counterOfferAmount to null', () => {
      const raw = JSON.stringify({
        suggestedReply: 'Let me check.',
        counterOfferAmount: 'not a number',
        sentiment: 'neutral',
        shouldEscalateToHuman: true,
        reasoning: 'Unclear terms.',
      });

      const result = parseNegotiatorOutput(raw);
      expect(result.counterOfferAmount).toBeNull();
    });

    it('should reject missing suggestedReply', () => {
      const raw = JSON.stringify({
        counterOfferAmount: 5000,
        sentiment: 'positive',
        shouldEscalateToHuman: false,
        reasoning: 'test',
      });

      expect(() => parseNegotiatorOutput(raw)).toThrow('Missing or invalid suggestedReply');
    });

    it('should reject invalid sentiment', () => {
      const raw = JSON.stringify({
        suggestedReply: 'Test reply',
        counterOfferAmount: 5000,
        sentiment: 'angry',
        shouldEscalateToHuman: false,
        reasoning: 'test',
      });

      expect(() => parseNegotiatorOutput(raw)).toThrow('Invalid sentiment');
    });

    it('should reject missing shouldEscalateToHuman', () => {
      const raw = JSON.stringify({
        suggestedReply: 'Test reply',
        counterOfferAmount: 5000,
        sentiment: 'positive',
        reasoning: 'test',
      });

      expect(() => parseNegotiatorOutput(raw)).toThrow('Missing or invalid shouldEscalateToHuman');
    });

    it('should reject invalid JSON', () => {
      expect(() => parseNegotiatorOutput('not json')).toThrow();
    });
  });

  describe('buildUserPrompt', () => {
    const baseInput: NegotiatorAgentInput = {
      organizationId: 'org-1',
      emailId: 'email-1',
      inboundBody: 'We want to offer $3000 for a YouTube integration.',
      creatorId: 'creator-1',
    };

    it('should build a basic prompt with email body and creator ID', () => {
      const prompt = buildUserPrompt(baseInput, null);
      expect(prompt).toContain('We want to offer $3000');
      expect(prompt).toContain('Creator ID: creator-1');
      expect(prompt).not.toContain('minimum CPM');
    });

    it('should include creator minimum CPM when available', () => {
      const prompt = buildUserPrompt(baseInput, 25.50);
      expect(prompt).toContain("Creator's minimum CPM: $25.50");
    });

    it('should include historical CPM when provided', () => {
      const input = { ...baseInput, historicalCPM: 30.00 };
      const prompt = buildUserPrompt(input, null);
      expect(prompt).toContain('Historical CPM for similar deals: $30.00');
    });

    it('should include campaign budget range when provided', () => {
      const input = { ...baseInput, campaignBudgetRange: { min: 2000, max: 8000 } };
      const prompt = buildUserPrompt(input, null);
      expect(prompt).toContain('Campaign budget range: $2000 - $8000');
    });

    it('should include all context when everything is provided', () => {
      const input: NegotiatorAgentInput = {
        ...baseInput,
        historicalCPM: 30.00,
        campaignBudgetRange: { min: 2000, max: 8000 },
      };
      const prompt = buildUserPrompt(input, 25.50);
      expect(prompt).toContain('minimum CPM: $25.50');
      expect(prompt).toContain('Historical CPM');
      expect(prompt).toContain('Campaign budget range');
    });
  });
});
