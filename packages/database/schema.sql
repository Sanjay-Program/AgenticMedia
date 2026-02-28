-- AgenticMedia database schema
-- This file is automatically loaded when the PostgreSQL container is first created.

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Enum Types
-- ============================================================
CREATE TYPE plan_tier AS ENUM ('starter', 'growth', 'enterprise');
CREATE TYPE user_role AS ENUM ('admin', 'talent_manager', 'data_analyst', 'client_readonly');
CREATE TYPE platform_type AS ENUM ('youtube', 'instagram', 'tiktok', 'linkedin', 'twitter');
CREATE TYPE contact_source AS ENUM ('apollo', 'zoominfo', 'manual');
CREATE TYPE campaign_outreach_status AS ENUM ('draft', 'active', 'paused', 'completed');
CREATE TYPE email_status AS ENUM ('queued', 'sent', 'delivered', 'opened', 'replied', 'bounced');
CREATE TYPE reply_sentiment AS ENUM ('positive', 'neutral', 'negative', 'interested');
CREATE TYPE campaign_status AS ENUM ('negotiating', 'active', 'completed', 'cancelled');
CREATE TYPE contract_status AS ENUM ('draft', 'pending_signatures', 'active', 'completed', 'disputed');
CREATE TYPE split_recipient_type AS ENUM ('platform', 'agency', 'creator');
CREATE TYPE split_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'refunded');
CREATE TYPE credential_type AS ENUM ('oauth_token', 'api_key', 'webhook_secret');
CREATE TYPE job_status AS ENUM ('queued', 'processing', 'completed', 'failed');

-- ============================================================
-- Auto-update trigger function for updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Core Identity & Multi-Tenancy
-- ============================================================

CREATE TABLE organizations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    custom_domain VARCHAR(255),
    branding_config JSONB DEFAULT '{}',
    stripe_account_id VARCHAR(255),
    plan_tier   plan_tier NOT NULL DEFAULT 'starter',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            user_role NOT NULL DEFAULT 'client_readonly',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- ============================================================
-- Creator Management
-- ============================================================

CREATE TABLE creators (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    full_name                   VARCHAR(255) NOT NULL,
    email                       VARCHAR(255),
    avatar_url                  TEXT,
    bio                         TEXT,
    primary_platform            platform_type,
    stripe_connected_account_id VARCHAR(255),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_creators_organization_id ON creators(organization_id);
CREATE INDEX idx_creators_email ON creators(email);
CREATE INDEX idx_creators_primary_platform ON creators(primary_platform);

CREATE TRIGGER trg_creators_updated_at
    BEFORE UPDATE ON creators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE creator_platforms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id      UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    platform        platform_type NOT NULL,
    platform_user_id VARCHAR(255),
    username        VARCHAR(255),
    followers_count BIGINT DEFAULT 0,
    engagement_rate NUMERIC(7, 4) DEFAULT 0,
    avg_views       BIGINT DEFAULT 0,
    last_synced_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (creator_id, platform)
);

CREATE INDEX idx_creator_platforms_creator_id ON creator_platforms(creator_id);
CREATE INDEX idx_creator_platforms_platform ON creator_platforms(platform);

CREATE TRIGGER trg_creator_platforms_updated_at
    BEFORE UPDATE ON creator_platforms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Sequence Alpha: AI Demand Generation
-- ============================================================

CREATE TABLE brand_contacts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_name    VARCHAR(255) NOT NULL,
    contact_name    VARCHAR(255) NOT NULL,
    contact_email   VARCHAR(255) NOT NULL,
    contact_title   VARCHAR(255),
    linkedin_url    TEXT,
    source          contact_source NOT NULL DEFAULT 'manual',
    enrichment_data JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brand_contacts_organization_id ON brand_contacts(organization_id);
CREATE INDEX idx_brand_contacts_contact_email ON brand_contacts(contact_email);

CREATE TRIGGER trg_brand_contacts_updated_at
    BEFORE UPDATE ON brand_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE outreach_campaigns (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    creator_id       UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    name             VARCHAR(255) NOT NULL,
    status           campaign_outreach_status NOT NULL DEFAULT 'draft',
    target_industry  VARCHAR(255),
    budget_range_min NUMERIC(12, 2),
    budget_range_max NUMERIC(12, 2),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outreach_campaigns_organization_id ON outreach_campaigns(organization_id);
CREATE INDEX idx_outreach_campaigns_creator_id ON outreach_campaigns(creator_id);
CREATE INDEX idx_outreach_campaigns_status ON outreach_campaigns(status);

CREATE TRIGGER trg_outreach_campaigns_updated_at
    BEFORE UPDATE ON outreach_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE outreach_emails (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id      UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
    brand_contact_id UUID NOT NULL REFERENCES brand_contacts(id) ON DELETE CASCADE,
    subject          VARCHAR(500) NOT NULL,
    body_html        TEXT NOT NULL,
    status           email_status NOT NULL DEFAULT 'queued',
    sent_at          TIMESTAMPTZ,
    opened_at        TIMESTAMPTZ,
    replied_at       TIMESTAMPTZ,
    llm_model_used   VARCHAR(255),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outreach_emails_campaign_id ON outreach_emails(campaign_id);
CREATE INDEX idx_outreach_emails_brand_contact_id ON outreach_emails(brand_contact_id);
CREATE INDEX idx_outreach_emails_status ON outreach_emails(status);

CREATE TABLE outreach_replies (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_id         UUID NOT NULL REFERENCES outreach_emails(id) ON DELETE CASCADE,
    raw_body         TEXT NOT NULL,
    sentiment        reply_sentiment,
    ai_summary       TEXT,
    suggested_action TEXT,
    reviewed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outreach_replies_email_id ON outreach_replies(email_id);
CREATE INDEX idx_outreach_replies_reviewed_by ON outreach_replies(reviewed_by);
CREATE INDEX idx_outreach_replies_sentiment ON outreach_replies(sentiment);

-- ============================================================
-- Sequence Gamma: Creator Discovery & AI Matching
-- ============================================================

CREATE TABLE discovery_metrics (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_platform_id UUID NOT NULL REFERENCES creator_platforms(id) ON DELETE CASCADE,
    snapshot_date       DATE NOT NULL,
    followers_count     BIGINT DEFAULT 0,
    following_count     BIGINT DEFAULT 0,
    posts_count         BIGINT DEFAULT 0,
    avg_likes           BIGINT DEFAULT 0,
    avg_comments        BIGINT DEFAULT 0,
    avg_views           BIGINT DEFAULT 0,
    engagement_rate     NUMERIC(7, 4) DEFAULT 0,
    growth_velocity     NUMERIC(7, 4) DEFAULT 0,
    ai_score            NUMERIC(5, 2) DEFAULT 0 CHECK (ai_score >= 0 AND ai_score <= 100),
    demographics        JSONB DEFAULT '{}',
    brand_affinity      JSONB DEFAULT '[]',
    predicted_roi       NUMERIC(12, 2),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (creator_platform_id, snapshot_date)
);

CREATE INDEX idx_discovery_metrics_creator_platform_id ON discovery_metrics(creator_platform_id);
CREATE INDEX idx_discovery_metrics_snapshot_date ON discovery_metrics(snapshot_date);
CREATE INDEX idx_discovery_metrics_ai_score ON discovery_metrics(ai_score);

-- ============================================================
-- Sequence Delta: Fintech Payout & Smart Routing
-- ============================================================

CREATE TABLE campaigns (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    creator_id          UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    brand_contact_id    UUID REFERENCES brand_contacts(id) ON DELETE SET NULL,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    status              campaign_status NOT NULL DEFAULT 'negotiating',
    total_value         NUMERIC(14, 2) NOT NULL DEFAULT 0,
    currency            VARCHAR(3) NOT NULL DEFAULT 'USD',
    start_date          DATE,
    end_date            DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_organization_id ON campaigns(organization_id);
CREATE INDEX idx_campaigns_creator_id ON campaigns(creator_id);
CREATE INDEX idx_campaigns_brand_contact_id ON campaigns(brand_contact_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

CREATE TRIGGER trg_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE smart_contracts (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id            UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    status                 contract_status NOT NULL DEFAULT 'draft',
    terms                  JSONB DEFAULT '{}',
    platform_fee_percent   NUMERIC(5, 2) NOT NULL DEFAULT 2.0,
    agency_fee_percent     NUMERIC(5, 2) NOT NULL DEFAULT 15.0,
    creator_payout_percent NUMERIC(5, 2) NOT NULL DEFAULT 83.0,
    total_amount           NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fee_percentages_sum CHECK (
        platform_fee_percent + agency_fee_percent + creator_payout_percent = 100
    )
);

CREATE INDEX idx_smart_contracts_campaign_id ON smart_contracts(campaign_id);
CREATE INDEX idx_smart_contracts_status ON smart_contracts(status);

CREATE TRIGGER trg_smart_contracts_updated_at
    BEFORE UPDATE ON smart_contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE revenue_splits (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    smart_contract_id  UUID NOT NULL REFERENCES smart_contracts(id) ON DELETE CASCADE,
    recipient_type     split_recipient_type NOT NULL,
    recipient_id       UUID NOT NULL,
    amount             NUMERIC(14, 2) NOT NULL DEFAULT 0,
    currency           VARCHAR(3) NOT NULL DEFAULT 'USD',
    stripe_transfer_id VARCHAR(255),
    status             split_status NOT NULL DEFAULT 'pending',
    processed_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revenue_splits_smart_contract_id ON revenue_splits(smart_contract_id);
CREATE INDEX idx_revenue_splits_recipient_id ON revenue_splits(recipient_id);
CREATE INDEX idx_revenue_splits_status ON revenue_splits(status);

CREATE TABLE payments (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    smart_contract_id        UUID NOT NULL REFERENCES smart_contracts(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
    amount                   NUMERIC(14, 2) NOT NULL DEFAULT 0,
    currency                 VARCHAR(3) NOT NULL DEFAULT 'USD',
    status                   payment_status NOT NULL DEFAULT 'pending',
    paid_by_brand_contact_id UUID REFERENCES brand_contacts(id) ON DELETE SET NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_smart_contract_id ON payments(smart_contract_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_paid_by_brand_contact_id ON payments(paid_by_brand_contact_id);

CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Security
-- ============================================================

CREATE TABLE encrypted_credentials (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    credential_type credential_type NOT NULL,
    service_name    VARCHAR(255) NOT NULL,
    encrypted_value TEXT NOT NULL,
    iv              VARCHAR(255) NOT NULL,
    auth_tag        VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_encrypted_credentials_organization_id ON encrypted_credentials(organization_id);

CREATE TRIGGER trg_encrypted_credentials_updated_at
    BEFORE UPDATE ON encrypted_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Job Tracking
-- ============================================================

CREATE TABLE job_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    job_type        VARCHAR(255) NOT NULL,
    job_id          VARCHAR(255) NOT NULL,
    status          job_status NOT NULL DEFAULT 'queued',
    payload         JSONB DEFAULT '{}',
    result          JSONB,
    error_message   TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_logs_organization_id ON job_logs(organization_id);
CREATE INDEX idx_job_logs_job_type ON job_logs(job_type);
CREATE INDEX idx_job_logs_status ON job_logs(status);
CREATE INDEX idx_job_logs_job_id ON job_logs(job_id);

-- ============================================================
-- Phase 1: IAM & Zero-Trust Security (Audit Events & ABAC)
-- ============================================================

CREATE TYPE audit_action AS ENUM (
    'create', 'read', 'update', 'delete',
    'login', 'logout', 'token_refresh',
    'export', 'import', 'approve', 'reject',
    'agent_action'
);

CREATE TYPE audit_actor_type AS ENUM ('user', 'ai_agent', 'system', 'api_key');

-- Immutable append-only audit log for SOC-2 Type II compliance
CREATE TABLE audit_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_type      audit_actor_type NOT NULL,
    actor_id        VARCHAR(255) NOT NULL,
    action          audit_action NOT NULL,
    resource_type   VARCHAR(255) NOT NULL,
    resource_id     VARCHAR(255),
    metadata        JSONB DEFAULT '{}',
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent UPDATE and DELETE on audit_events (append-only)
CREATE RULE audit_events_no_update AS ON UPDATE TO audit_events DO INSTEAD NOTHING;
CREATE RULE audit_events_no_delete AS ON DELETE TO audit_events DO INSTEAD NOTHING;

CREATE INDEX idx_audit_events_organization_id ON audit_events(organization_id);
CREATE INDEX idx_audit_events_actor_id ON audit_events(actor_id);
CREATE INDEX idx_audit_events_action ON audit_events(action);
CREATE INDEX idx_audit_events_resource_type ON audit_events(resource_type);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at);

-- ABAC (Attribute-Based Access Control) permissions
CREATE TABLE abac_policies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    effect          VARCHAR(10) NOT NULL DEFAULT 'allow' CHECK (effect IN ('allow', 'deny')),
    conditions      JSONB NOT NULL DEFAULT '{}',
    resource_type   VARCHAR(255) NOT NULL,
    actions         TEXT[] NOT NULL,
    priority        INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_abac_policies_organization_id ON abac_policies(organization_id);
CREATE INDEX idx_abac_policies_resource_type ON abac_policies(resource_type);

CREATE TRIGGER trg_abac_policies_updated_at
    BEFORE UPDATE ON abac_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SSO/SAML configuration per organization
CREATE TABLE sso_configurations (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    provider          VARCHAR(50) NOT NULL CHECK (provider IN ('okta', 'google_workspace', 'azure_ad', 'custom_saml')),
    entity_id         VARCHAR(500) NOT NULL,
    sso_url           VARCHAR(500) NOT NULL,
    certificate       TEXT NOT NULL,
    metadata_url      VARCHAR(500),
    is_active         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_sso_configurations_updated_at
    BEFORE UPDATE ON sso_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Phase 2: Event Broker (Event Routing)
-- ============================================================

CREATE TYPE event_status AS ENUM ('pending', 'processing', 'delivered', 'failed', 'dead_letter');

CREATE TABLE event_log (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id   UUID REFERENCES organizations(id) ON DELETE SET NULL,
    event_type        VARCHAR(255) NOT NULL,
    source            VARCHAR(255) NOT NULL,
    payload           JSONB NOT NULL DEFAULT '{}',
    status            event_status NOT NULL DEFAULT 'pending',
    idempotency_key   VARCHAR(255) NOT NULL UNIQUE,
    retry_count       INTEGER NOT NULL DEFAULT 0,
    max_retries       INTEGER NOT NULL DEFAULT 3,
    error_message     TEXT,
    processed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_log_event_type ON event_log(event_type);
CREATE INDEX idx_event_log_status ON event_log(status);
CREATE INDEX idx_event_log_idempotency_key ON event_log(idempotency_key);
CREATE INDEX idx_event_log_created_at ON event_log(created_at);

-- ============================================================
-- Phase 3: AI Agent Swarm
-- ============================================================

CREATE TYPE agent_type AS ENUM ('scout', 'negotiator', 'legal', 'orchestrator');
CREATE TYPE agent_run_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

CREATE TABLE agent_runs (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    agent_type        agent_type NOT NULL,
    parent_run_id     UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
    status            agent_run_status NOT NULL DEFAULT 'pending',
    input_data        JSONB NOT NULL DEFAULT '{}',
    output_data       JSONB,
    error_message     TEXT,
    llm_model         VARCHAR(255),
    token_usage       JSONB DEFAULT '{}',
    idempotency_key   VARCHAR(255) UNIQUE,
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_runs_organization_id ON agent_runs(organization_id);
CREATE INDEX idx_agent_runs_agent_type ON agent_runs(agent_type);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_parent_run_id ON agent_runs(parent_run_id);
CREATE INDEX idx_agent_runs_idempotency_key ON agent_runs(idempotency_key);

-- ============================================================
-- Phase 4: Double-Entry Accounting Ledger
-- ============================================================

CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
CREATE TYPE ledger_entry_type AS ENUM ('debit', 'credit');
CREATE TYPE financial_tx_status AS ENUM ('pending', 'posted', 'reversed', 'failed');

CREATE TABLE ledger_accounts (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,
    account_type      account_type NOT NULL,
    currency          VARCHAR(3) NOT NULL DEFAULT 'USD',
    balance           NUMERIC(18, 2) NOT NULL DEFAULT 0,
    is_system_account BOOLEAN NOT NULL DEFAULT FALSE,
    metadata          JSONB DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, name)
);

CREATE INDEX idx_ledger_accounts_organization_id ON ledger_accounts(organization_id);
CREATE INDEX idx_ledger_accounts_account_type ON ledger_accounts(account_type);

CREATE TRIGGER trg_ledger_accounts_updated_at
    BEFORE UPDATE ON ledger_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE financial_transactions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    reference_type    VARCHAR(255) NOT NULL,
    reference_id      UUID,
    description       TEXT NOT NULL,
    status            financial_tx_status NOT NULL DEFAULT 'pending',
    idempotency_key   VARCHAR(255) NOT NULL UNIQUE,
    posted_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_financial_transactions_organization_id ON financial_transactions(organization_id);
CREATE INDEX idx_financial_transactions_status ON financial_transactions(status);
CREATE INDEX idx_financial_transactions_idempotency_key ON financial_transactions(idempotency_key);
CREATE INDEX idx_financial_transactions_reference ON financial_transactions(reference_type, reference_id);

CREATE TABLE ledger_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id  UUID NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
    account_id      UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
    entry_type      ledger_entry_type NOT NULL,
    amount          NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_entries_transaction_id ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_entries_account_id ON ledger_entries(account_id);

-- Ensure double-entry invariant: every transaction must have balanced debits and credits
-- This is enforced at the application layer via transactions, but we add a helper view
CREATE VIEW ledger_transaction_balance AS
SELECT
    transaction_id,
    SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END) AS total_debits,
    SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END) AS total_credits,
    SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END) -
    SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END) AS balance
FROM ledger_entries
GROUP BY transaction_id;
