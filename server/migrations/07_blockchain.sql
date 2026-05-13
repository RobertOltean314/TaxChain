-- Phase 10: on-chain invoice anchoring
-- Adds blockchain provenance columns to the factura table.

ALTER TABLE factura ADD COLUMN IF NOT EXISTS tx_hash     VARCHAR(66);
ALTER TABLE factura ADD COLUMN IF NOT EXISTS block_number BIGINT;
ALTER TABLE factura ADD COLUMN IF NOT EXISTS anchored_at  TIMESTAMPTZ;
