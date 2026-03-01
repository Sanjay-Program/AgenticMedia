import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@agenticmedia/database';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { publishEvent } from '../services/event-bus';
import type { EventType } from '@agenticmedia/shared-types';

export const agentsRouter = Router();
agentsRouter.use(authenticate);

// List agent runs
agentsRouter.get('/runs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agentType, status, page = '1', limit = '20' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions: string[] = ['organization_id = $1'];
    const params: unknown[] = [req.user!.organizationId];
    let paramIndex = 2;

    if (agentType) {
      conditions.push(`agent_type = $${paramIndex++}`);
      params.push(agentType);
    }
    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    params.push(Number(limit), offset);

    const result = await query(
      `SELECT id, agent_type, status, input_data, output_data, error_message,
              llm_model, token_usage, started_at, completed_at, created_at
       FROM agent_runs
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM agent_runs WHERE ${conditions.join(' AND ')}`,
      params.slice(0, conditions.length)
    );

    res.json({
      runs: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    next(err);
  }
});

// Get single agent run
agentsRouter.get('/runs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT * FROM agent_runs WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user!.organizationId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Agent run not found' });
      return;
    }

    res.json({ run: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Get agent stats summary
agentsRouter.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.organizationId;

    const [byType, byStatus, tokenUsage] = await Promise.all([
      query(
        `SELECT agent_type, COUNT(*) as count
         FROM agent_runs WHERE organization_id = $1
         GROUP BY agent_type ORDER BY count DESC`,
        [orgId]
      ),
      query(
        `SELECT status, COUNT(*) as count
         FROM agent_runs WHERE organization_id = $1
         GROUP BY status ORDER BY count DESC`,
        [orgId]
      ),
      query(
        `SELECT COALESCE(SUM((token_usage->>'totalTokens')::int), 0) as total_tokens
         FROM agent_runs WHERE organization_id = $1 AND status = 'completed'`,
        [orgId]
      ),
    ]);

    res.json({
      byAgentType: byType.rows,
      byStatus: byStatus.rows,
      totalTokensUsed: parseInt(tokenUsage.rows[0].total_tokens, 10),
    });
  } catch (err) {
    next(err);
  }
});

// Ghost Negotiator: Approve or reject an AI-drafted counter-offer
agentsRouter.post(
  '/negotiate/approve',
  authorize('admin', 'talent_manager'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentRunId, approved, editedReply } = req.body;

      if (!agentRunId || typeof approved !== 'boolean') {
        res.status(400).json({ error: 'agentRunId and approved (boolean) required' });
        return;
      }

      // Fetch the agent run
      const runResult = await query(
        `SELECT * FROM agent_runs WHERE id = $1 AND organization_id = $2 AND agent_type = 'negotiator'`,
        [agentRunId, req.user!.organizationId]
      );

      if (runResult.rows.length === 0) {
        res.status(404).json({ error: 'Negotiator run not found' });
        return;
      }

      const run = runResult.rows[0];
      const outputData = run.output_data || {};

      if (approved) {
        // Use the edited reply if provided, otherwise use the AI's suggested reply
        const finalReply = editedReply || outputData.suggestedReply;

        // In production, this would send the email via the organization's email integration
        // For now, log to audit_events and publish an event
        await query(
          `INSERT INTO audit_events (id, organization_id, actor_type, actor_id, action, resource_type, resource_id, metadata)
           VALUES ($1, $2, 'user', $3, 'approve', 'negotiator_reply', $4, $5)`,
          [
            uuidv4(),
            req.user!.organizationId,
            req.user!.userId,
            agentRunId,
            JSON.stringify({
              approved: true,
              originalReply: outputData.suggestedReply,
              finalReply,
              counterOfferAmount: outputData.counterOfferAmount,
              approvedBy: req.user!.userId,
            }),
          ]
        );

        await publishEvent({
          organizationId: req.user!.organizationId,
          eventType: 'email.sent' as EventType,
          source: 'ghost-negotiator',
          payload: {
            agentRunId,
            reply: finalReply,
            counterOfferAmount: outputData.counterOfferAmount,
            approvedBy: req.user!.userId,
          },
          idempotencyKey: `negotiator-approve-${agentRunId}`,
        });

        res.json({ status: 'approved', reply: finalReply });
      } else {
        // Log rejection
        await query(
          `INSERT INTO audit_events (id, organization_id, actor_type, actor_id, action, resource_type, resource_id, metadata)
           VALUES ($1, $2, 'user', $3, 'reject', 'negotiator_reply', $4, $5)`,
          [
            uuidv4(),
            req.user!.organizationId,
            req.user!.userId,
            agentRunId,
            JSON.stringify({ approved: false, rejectedBy: req.user!.userId }),
          ]
        );

        res.json({ status: 'rejected' });
      }
    } catch (err) {
      next(err);
    }
  }
);
