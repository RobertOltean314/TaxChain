-- ============================================================================
-- Migration 06: Entity management (accountant → managed entities)
-- ============================================================================

-- Explicit many-to-many: one accountant user manages N PF/PJ entities.
CREATE TABLE IF NOT EXISTS accountant_entity (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(2)  NOT NULL CHECK (entity_type IN ('PF', 'PJ')),
    pf_id       UUID        REFERENCES persoana_fizica(id) ON DELETE CASCADE,
    pj_id       UUID        REFERENCES persoana_juridica(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate entries per user per entity
    CONSTRAINT uq_accountant_pf UNIQUE (user_id, pf_id),
    CONSTRAINT uq_accountant_pj UNIQUE (user_id, pj_id),

    -- Exactly one entity kind must be set
    CONSTRAINT valid_entity_ref CHECK (
        (entity_type = 'PF' AND pf_id IS NOT NULL AND pj_id IS NULL) OR
        (entity_type = 'PJ' AND pj_id IS NOT NULL AND pf_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_accountant_entity_user ON accountant_entity(user_id);

-- ── Partner ownership columns ────────────────────────────────────────────────
-- Existing persoana_fizica_id / persoana_juridica_id on partener link the
-- partner record TO a PF/PJ legal entity (i.e. "this client IS SRL Acme").
-- The new owner_* columns say "this partner record belongs to entity X's scope".
ALTER TABLE partener
    ADD COLUMN IF NOT EXISTS owner_pf_id UUID REFERENCES persoana_fizica(id)  ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS owner_pj_id UUID REFERENCES persoana_juridica(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partener_owner_pf ON partener(owner_pf_id) WHERE owner_pf_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partener_owner_pj ON partener(owner_pj_id) WHERE owner_pj_id IS NOT NULL;

-- ── BNR exchange rate cache ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS curs_valutar (
    id       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    currency CHAR(3)       NOT NULL,
    rate     NUMERIC(12,6) NOT NULL,
    date     DATE          NOT NULL,
    UNIQUE (currency, date)
);

CREATE INDEX IF NOT EXISTS idx_curs_valutar_lookup ON curs_valutar(currency, date DESC);
