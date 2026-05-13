-- Phase 9/10: Fiscal compliance proofs anchored on Sepolia.
-- Each row represents one period commitment: "I declare my TVA for period X."

CREATE TABLE IF NOT EXISTS dovada_fiscala (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL REFERENCES users(id),
    entity_type      VARCHAR(2)   NOT NULL CHECK (entity_type IN ('PF', 'PJ')),
    entity_id        UUID         NOT NULL,
    period_from      DATE         NOT NULL,
    period_to        DATE         NOT NULL,
    vat_colectat     NUMERIC(14,2) NOT NULL DEFAULT 0,
    vat_deductibil   NUMERIC(14,2) NOT NULL DEFAULT 0,
    vat_net          NUMERIC(14,2) NOT NULL DEFAULT 0,
    venituri_brute   NUMERIC(14,2) NOT NULL DEFAULT 0,
    cheltuieli_brute NUMERIC(14,2) NOT NULL DEFAULT 0,
    proof_hash       VARCHAR(66)  NOT NULL,
    period_hash      VARCHAR(66)  NOT NULL,
    tx_hash          VARCHAR(66)  NOT NULL,
    block_number     BIGINT       NOT NULL,
    anchored_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dovada_fiscala_entity
    ON dovada_fiscala (entity_type, entity_id, period_from);
