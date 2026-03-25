-- ============================================================================
-- TAXCHAIN — AUTH MIGRATION (Phase 1)
-- Tables: users, auth_nonces, refresh_tokens
-- ============================================================================

-- ENUM
CREATE TYPE user_role AS ENUM (
    'Admin',
    'Taxpayer',
    'Auditor'
);

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id                          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Auth provider columns
    google_id                   VARCHAR(255)    UNIQUE,
    wallet_address              VARCHAR(42)     UNIQUE
                                CHECK (wallet_address ~ '^0x[0-9a-fA-F]{40}$'),
    
    -- Custodial wallet (assigned to ALL users)
    assigned_wallet_address     VARCHAR(42)     NOT NULL UNIQUE
                                CHECK (assigned_wallet_address ~ '^0x[0-9a-fA-F]{40}$'),
    assigned_wallet_key_enc     TEXT,   -- NULLABLE for wallet-login users
    
    -- Profile
    email                       VARCHAR(100)
                                CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    display_name                VARCHAR(100),
    
    -- Role & status
    role                        user_role       NOT NULL DEFAULT 'Taxpayer',
    is_active                   BOOLEAN         NOT NULL DEFAULT TRUE,
    
    -- Entity links
    persoana_fizica_id          UUID            REFERENCES persoana_fizica(id)    ON DELETE SET NULL,
    persoana_juridica_id        UUID            REFERENCES persoana_juridica(id)  ON DELETE SET NULL,
    
    -- Audit
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- AUTH NONCES TABLE
CREATE TABLE IF NOT EXISTS auth_nonces (
    wallet_address              VARCHAR(42)     PRIMARY KEY
                                CHECK (wallet_address ~ '^0x[0-9a-fA-F]{40}$'),
    nonce                       TEXT            NOT NULL,
    expires_at                  TIMESTAMPTZ     NOT NULL
);

-- REFRESH TOKENS TABLE
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id                          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash                  VARCHAR(64)     NOT NULL UNIQUE,
    expires_at                  TIMESTAMPTZ     NOT NULL,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_users_google_id
    ON users(google_id)
    WHERE google_id IS NOT NULL;

CREATE INDEX idx_users_wallet_address
    ON users(wallet_address)
    WHERE wallet_address IS NOT NULL;

CREATE INDEX idx_users_assigned_wallet_address
    ON users(assigned_wallet_address);

CREATE INDEX idx_users_persoana_fizica_id
    ON users(persoana_fizica_id)
    WHERE persoana_fizica_id IS NOT NULL;

CREATE INDEX idx_users_persoana_juridica_id
    ON users(persoana_juridica_id)
    WHERE persoana_juridica_id IS NOT NULL;

CREATE INDEX idx_refresh_tokens_user_id
    ON refresh_tokens(user_id);

CREATE INDEX idx_persoana_fizica_wallet
    ON persoana_fizica(wallet)
    WHERE wallet IS NOT NULL;

CREATE INDEX idx_persoana_juridica_wallet
    ON persoana_juridica(wallet)
    WHERE wallet IS NOT NULL;

CREATE INDEX idx_reprezentanti_persoana_fizica
    ON reprezentanti_persoana_juridica(persoana_fizica_id);