import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { authRouter } from './routes/auth';
import { creatorsRouter } from './routes/creators';
import { outreachRouter } from './routes/outreach';
import { discoveryRouter } from './routes/discovery';
import { fintechRouter } from './routes/fintech';
import { webhookRouter } from './routes/webhooks';
import { integrationsRouter } from './routes/integrations';
import { dashboardRouter } from './routes/dashboard';
import { agentsRouter } from './routes/agents';
import { automationsRouter } from './routes/automations';
import { usersRouter } from './routes/users';
import { organizationsRouter } from './routes/organizations';
import { auditRouter } from './routes/audit';
import { ledgerRouter } from './routes/ledger';
import { scoutRouter } from './routes/scout';
import { videoRouter } from './routes/video';
import { sentimentRouter } from './routes/sentiment';
import { brandingRouter } from './routes/branding';
import { errorHandler } from './middleware/error-handler';
import { swaggerSpec } from './docs/swagger';
import { initializeOrchestrator } from './services/agents/orchestrator';
import { initializeWebSocket } from './services/websocket';

const app = express();
const httpServer = createServer(app);

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));

// Webhooks need raw body for Stripe signature verification
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

// JSON parsing for all other routes
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AgenticMedia API Docs',
}));
app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/creators', creatorsRouter);
app.use('/api/outreach', outreachRouter);
app.use('/api/discovery', discoveryRouter);
app.use('/api/fintech', fintechRouter);
app.use('/api/webhooks', webhookRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/automations', automationsRouter);
app.use('/api/users', usersRouter);
app.use('/api/organizations', organizationsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/scout', scoutRouter);
app.use('/api/video', videoRouter);
app.use('/api/sentiment', sentimentRouter);
app.use('/api/branding', brandingRouter);

// Global error handler
app.use(errorHandler);

if (config.NODE_ENV !== 'test') {
  // Initialize the AI Agent Orchestrator
  initializeOrchestrator();

  // Initialize WebSocket server for real-time events
  initializeWebSocket(httpServer);

  httpServer.listen(config.PORT, () => {
    console.log(`AgenticMedia API running on port ${config.PORT}`);
    console.log(`API docs available at http://localhost:${config.PORT}/api-docs`);
    console.log(`WebSocket server available at ws://localhost:${config.PORT}/ws`);
  });
}

export { app };
