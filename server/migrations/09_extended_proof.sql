-- Phase 9: Extend fiscal proofs table with full tax obligations + ZK proof columns.

ALTER TABLE dovada_fiscala
    ADD COLUMN IF NOT EXISTS impozit_venit   NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cas             NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cass            NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS impozit_profit  NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_obligatii NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_zk           BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS zk_proof_bytes  BYTEA,
    ADD COLUMN IF NOT EXISTS entity_name     VARCHAR(200) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS entity_fiscal_code VARCHAR(20) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_dovada_fiscala_fiscal_code
    ON dovada_fiscala (entity_fiscal_code);
