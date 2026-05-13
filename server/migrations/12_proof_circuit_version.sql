-- Tracks which ZK circuit version produced a given proof.
-- NULL means the proof was generated before versioning was introduced (legacy, unverifiable).
ALTER TABLE dovada_fiscala
    ADD COLUMN IF NOT EXISTS circuit_version VARCHAR(20);
