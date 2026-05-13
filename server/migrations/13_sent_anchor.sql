-- Separate blockchain anchor columns for the Sent transition.
-- The existing tx_hash/block_number/anchored_at columns retain the Paid anchor.
ALTER TABLE factura ADD COLUMN IF NOT EXISTS sent_tx_hash     VARCHAR(66);
ALTER TABLE factura ADD COLUMN IF NOT EXISTS sent_block_number BIGINT;
ALTER TABLE factura ADD COLUMN IF NOT EXISTS sent_anchored_at  TIMESTAMPTZ;
