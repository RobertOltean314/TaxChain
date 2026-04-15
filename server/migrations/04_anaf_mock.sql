-- ============================================================================
-- ANAF MOCK SERVER TABLE
-- ============================================================================

CREATE TYPE efactura_status AS ENUM ('processing', 'ok', 'error');

CREATE TABLE IF NOT EXISTS efactura_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cif_emitent VARCHAR(20) NOT NULL,
    xml TEXT NOT NULL,
    status efactura_status NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
