-- ZK proofs generated without 2dp rounding of base values cannot be verified.
-- proof_handlers.rs now rounds venituri/cheltuieli/vat to 2dp before the circuit,
-- so verification can recompute exact scaled integers from stored NUMERIC(14,2) values.
DELETE FROM dovada_fiscala WHERE is_zk = true;
