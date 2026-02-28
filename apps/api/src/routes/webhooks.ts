import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@agenticmedia/database';

export const webhookRouter = Router();

// Email reply webhook (from email service provider)
webhookRouter.post('/email-reply', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { emailId, rawBody, fromEmail } = body;

    if (!emailId || !rawBody) {
      res.status(400).json({ error: 'Missing emailId or rawBody' });
      return;
    }

    // Find the original email
    const emailResult = await query(
      `SELECT oe.id, oe.campaign_id, oc.organization_id
       FROM outreach_emails oe
       JOIN outreach_campaigns oc ON oc.id = oe.campaign_id
       WHERE oe.id = $1`,
      [emailId]
    );

    if (emailResult.rows.length === 0) {
      res.status(404).json({ error: 'Original email not found' });
      return;
    }

    // Update email status
    await query(
      `UPDATE outreach_emails SET status = 'replied', replied_at = NOW() WHERE id = $1`,
      [emailId]
    );

    // Store the reply with placeholder sentiment (to be analyzed by AI worker)
    await query(
      `INSERT INTO outreach_replies (id, email_id, raw_body, sentiment, ai_summary, suggested_action)
       VALUES ($1, $2, $3, 'neutral', NULL, NULL)`,
      [uuidv4(), emailId, rawBody]
    );

    // Log for the organization
    await query(
      `INSERT INTO job_logs (id, organization_id, job_type, job_id, status, payload)
       VALUES ($1, $2, 'email_reply_received', $3, 'completed', $4)`,
      [uuidv4(), emailResult.rows[0].organization_id, emailId, JSON.stringify({ fromEmail, emailId })]
    );

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

// Stripe webhook handler
webhookRouter.post('/stripe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // For Stripe webhooks, the body comes as raw buffer
    const rawBody = req.body;
    
    // In production, verify the webhook signature using Stripe SDK:
    // const event = stripe.webhooks.constructEvent(rawBody, sig, config.STRIPE_WEBHOOK_SECRET);
    // For now, parse the event
    const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : 
                  Buffer.isBuffer(rawBody) ? JSON.parse(rawBody.toString()) : rawBody;

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        // Update payment status
        await query(
          `UPDATE payments SET status = 'succeeded', updated_at = NOW() 
           WHERE stripe_payment_intent_id = $1`,
          [paymentIntent.id]
        );
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        await query(
          `UPDATE payments SET status = 'failed', updated_at = NOW()
           WHERE stripe_payment_intent_id = $1`,
          [paymentIntent.id]
        );
        break;
      }
      case 'transfer.created': {
        const transfer = event.data.object;
        await query(
          `UPDATE revenue_splits SET status = 'processing' WHERE stripe_transfer_id = $1`,
          [transfer.id]
        );
        break;
      }
      case 'transfer.paid': {
        const transfer = event.data.object;
        await query(
          `UPDATE revenue_splits SET status = 'completed', processed_at = NOW() WHERE stripe_transfer_id = $1`,
          [transfer.id]
        );
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});
