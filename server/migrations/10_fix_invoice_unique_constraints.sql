-- Replace NULLS NOT DISTINCT unique constraints with partial unique indexes.
--
-- The original constraints treated all NULL issuer IDs as equal, so two PJ
-- invoices (emitent_pf_id = NULL) with the same number would conflict, even
-- though they belong to different PJ issuers. Partial indexes only enforce
-- uniqueness when the issuer ID is actually set.

ALTER TABLE factura DROP CONSTRAINT IF EXISTS chk_unique_numar_per_emitent_pf;
ALTER TABLE factura DROP CONSTRAINT IF EXISTS chk_unique_numar_per_emitent_pj;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_numar_per_emitent_pf
    ON factura (numar, emitent_pf_id)
    WHERE emitent_pf_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_numar_per_emitent_pj
    ON factura (numar, emitent_pj_id)
    WHERE emitent_pj_id IS NOT NULL;
