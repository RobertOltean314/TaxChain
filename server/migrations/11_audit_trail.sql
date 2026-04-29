-- Phase 11: Immutable audit trail
-- Every write action (invoice create/update/delete, proof generate) is recorded here.

CREATE TABLE IF NOT EXISTS audit_log (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    action          VARCHAR(64)  NOT NULL,          -- e.g. 'invoice.created'
    actor_user_id   UUID         NOT NULL REFERENCES users(id),
    entity_type     VARCHAR(2),                     -- 'PF' | 'PJ' | NULL
    entity_id       UUID,                           -- managed entity UUID | NULL
    resource_type   VARCHAR(32)  NOT NULL,          -- 'invoice' | 'proof'
    resource_id     UUID,                           -- specific record UUID | NULL
    payload         TEXT         NOT NULL DEFAULT '{}',  -- JSON-encoded detail
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity       ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource     ON audit_log (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor        ON audit_log (actor_user_id);
