-- ============================================================================
-- TAXCHAIN — AUTH MIGRATION
-- Phase 1: Login / Register System
-- 
-- Tables introduced:
--   users           → unified identity anchor for all auth providers
--   auth_nonces     → SIWE (Sign-In with Ethereum) challenge-response
--   refresh_tokens  → JWT refresh token rotation
--
-- Dependencies (must already exist):
--   persoana_fizica       (taxchain.session.sql)
--   persoana_juridica     (taxchain.session.sql)
-- ============================================================================


-- ============================================================================
-- ROLLBACK (run top-to-bottom to tear down cleanly)
-- ============================================================================

-- DROP INDEX  IF EXISTS idx_refresh_tokens_user_id;
-- DROP INDEX  IF EXISTS idx_users_persoana_juridica_id;
-- DROP INDEX  IF EXISTS idx_users_persoana_fizica_id;
-- DROP INDEX  IF EXISTS idx_users_google_id;
-- DROP INDEX  IF EXISTS idx_users_wallet_address;
-- DROP INDEX  IF EXISTS idx_users_assigned_wallet_address;
-- DROP INDEX  IF EXISTS idx_persoana_juridica_wallet;
-- DROP INDEX  IF EXISTS idx_persoana_fizica_wallet;
-- DROP INDEX  IF EXISTS idx_reprezentanti_persoana_fizica;

-- DROP TABLE  IF EXISTS refresh_tokens CASCADE;
-- DROP TABLE  IF EXISTS auth_nonces CASCADE;
-- DROP TABLE  IF EXISTS users CASCADE;

-- DROP TYPE   IF EXISTS user_role CASCADE;


-- ============================================================================
-- ENUMS
-- ============================================================================

-- CREATE TYPE user_role AS ENUM (
--     'Admin',
--     'Taxpayer',
--     'Auditor'
-- );


-- ============================================================================
-- USERS
-- Central identity table. One row per human/account.
-- A user may be linked to a PersoanaFizica, a PersoanaJuridica, both, or
-- neither (during the onboarding window before entity linking).
-- ============================================================================

-- CREATE TABLE IF NOT EXISTS users (
--     id                          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

--     -- -----------------------------------------------------------------------
--     -- Auth provider columns — at least one must be non-NULL at all times.
--     -- Enforced at the application layer during registration, not DB-level,
--     -- because the two providers arrive through different flows.
--     -- -----------------------------------------------------------------------

--     -- Google OAuth2 (subject claim from Google ID token)
--     google_id                   VARCHAR(255)    UNIQUE,

--     -- Wallet login address (EIP-55 checksummed, 42 chars: "0x" + 40 hex)
--     -- Populated only when the user registers via wallet auth, NOT the same
--     -- as assigned_wallet_address (which every user gets regardless of provider)
--     wallet_address              VARCHAR(42)     UNIQUE
--                                 CHECK (wallet_address ~ '^0x[0-9a-fA-F]{40}$'),

--     -- -----------------------------------------------------------------------
--     -- Custodial wallet — assigned to ALL users on first registration.
--     -- Google users get one auto-generated. Wallet users get their own address
--     -- mirrored here so blockchain interactions use a single column.
--     -- Private key is AES-256-GCM encrypted; key stored in env / secrets manager.
--     -- -----------------------------------------------------------------------
--     assigned_wallet_address     VARCHAR(42)     NOT NULL UNIQUE
--                                 CHECK (assigned_wallet_address ~ '^0x[0-9a-fA-F]{40}$'),
--     assigned_wallet_key_enc     TEXT            NOT NULL,   -- base64(iv || ciphertext || tag)

--     -- -----------------------------------------------------------------------
--     -- Profile
--     -- -----------------------------------------------------------------------
--     email                       VARCHAR(100)
--                                 CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
--     display_name                VARCHAR(100),

--     -- -----------------------------------------------------------------------
--     -- Role & status
--     -- -----------------------------------------------------------------------
--     role                        user_role       NOT NULL DEFAULT 'Taxpayer',
--     is_active                   BOOLEAN         NOT NULL DEFAULT TRUE,

--     -- -----------------------------------------------------------------------
--     -- Taxpayer entity links (both nullable — filled in post-registration flow)
--     --
--     -- Possible states:
--     --   pf only        → citizen taxpayer
--     --   pj only        → business account (edge case, admin-created)
--     --   pf + pj        → business owner / representative (dividend tax scenario)
--     --   both NULL       → freshly registered, pending entity linking
--     -- -----------------------------------------------------------------------
--     persoana_fizica_id          UUID            REFERENCES persoana_fizica(id)    ON DELETE SET NULL,
--     persoana_juridica_id        UUID            REFERENCES persoana_juridica(id)  ON DELETE SET NULL,

--     -- -----------------------------------------------------------------------
--     -- Audit
--     -- -----------------------------------------------------------------------
--     created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
--     updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
-- );


-- ============================================================================
-- AUTH NONCES
-- Stores the challenge string issued to a wallet address before it signs.
-- One row per address (upserted on each new challenge request).
-- Expired nonces are cleaned up by the application after verification.
-- ============================================================================

-- CREATE TABLE IF NOT EXISTS auth_nonces (
--     wallet_address              VARCHAR(42)     PRIMARY KEY
--                                 CHECK (wallet_address ~ '^0x[0-9a-fA-F]{40}$'),

--     -- Human-readable SIWE message including this nonce, ready to be signed
--     nonce                       VARCHAR(64)     NOT NULL,

--     -- Short TTL — nonces are single-use and expire quickly (e.g. 5 minutes)
--     expires_at                  TIMESTAMPTZ     NOT NULL
-- );


-- ============================================================================
-- REFRESH TOKENS
-- Enables JWT rotation without requiring re-authentication.
-- Raw token is NEVER stored — only a SHA-256 hash.
-- On refresh: validate hash → delete old row → issue new access + refresh pair.
-- ============================================================================

-- CREATE TABLE IF NOT EXISTS refresh_tokens (
--     id                          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
--     user_id                     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,

--     -- SHA-256 hash of the raw refresh token (hex-encoded, 64 chars)
--     token_hash                  VARCHAR(64)     NOT NULL UNIQUE,

--     -- Refresh tokens are longer-lived than access tokens (e.g. 7–30 days)
--     expires_at                  TIMESTAMPTZ     NOT NULL,

--     -- Useful for audit: know which device/session issued this token
--     created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
-- );


-- ============================================================================
-- INDEXES
-- ============================================================================

-- users — auth provider lookups (hit on every login)
-- CREATE INDEX idx_users_google_id
--     ON users(google_id)
--     WHERE google_id IS NOT NULL;

-- CREATE INDEX idx_users_wallet_address
--     ON users(wallet_address)
--     WHERE wallet_address IS NOT NULL;

-- CREATE INDEX idx_users_assigned_wallet_address
--     ON users(assigned_wallet_address);

-- -- users — entity link lookups (dividend tax queries, role checks)
-- CREATE INDEX idx_users_persoana_fizica_id
--     ON users(persoana_fizica_id)
--     WHERE persoana_fizica_id IS NOT NULL;

-- CREATE INDEX idx_users_persoana_juridica_id
--     ON users(persoana_juridica_id)
--     WHERE persoana_juridica_id IS NOT NULL;

-- -- refresh_tokens — used on every token refresh request
-- CREATE INDEX idx_refresh_tokens_user_id
--     ON refresh_tokens(user_id);

-- -- existing tables — wallet lookups for future blockchain / ZK queries
-- CREATE INDEX idx_persoana_fizica_wallet
--     ON persoana_fizica(wallet)
--     WHERE wallet IS NOT NULL;

-- CREATE INDEX idx_persoana_juridica_wallet
--     ON persoana_juridica(wallet)
--     WHERE wallet IS NOT NULL;

-- -- existing table — optimises the dividend tax join pattern:
-- --   users → persoana_fizica → reprezentanti_persoana_juridica → persoana_juridica
-- CREATE INDEX idx_reprezentanti_persoana_fizica
--     ON reprezentanti_persoana_juridica(persoana_fizica_id);


-- ============================================================================
-- VERIFICATION QUERIES (run manually to confirm migration applied correctly)
-- ============================================================================

SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;

SELECT typname, enumlabel FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE typname = 'user_role';

SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position;

SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename IN ('users', 'auth_nonces', 'refresh_tokens',
                        'persoana_fizica', 'persoana_juridica',
                        'reprezentanti_persoana_juridica')
    ORDER BY tablename, indexname;