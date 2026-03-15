-- -- DROP INDEX IF EXISTS idx_factura_linie_factura_id;
-- -- DROP INDEX IF EXISTS idx_factura_partener_id;
-- -- DROP INDEX IF EXISTS idx_factura_emitent_pj;
-- -- DROP INDEX IF EXISTS idx_factura_emitent_pf;
-- -- DROP INDEX IF EXISTS idx_factura_stare;
-- -- DROP INDEX IF EXISTS idx_factura_data_emitere;
-- -- DROP INDEX IF EXISTS idx_partener_cod_fiscal;
-- -- DROP INDEX IF EXISTS idx_partener_created_by;

-- -- DROP TABLE IF EXISTS factura_linie CASCADE;
-- -- DROP TABLE IF EXISTS factura CASCADE;
-- -- DROP TABLE IF EXISTS partener CASCADE;

-- -- DROP TYPE IF EXISTS cota_tva CASCADE;
-- -- DROP TYPE IF EXISTS tip_entitate CASCADE;
-- -- DROP TYPE IF EXISTS tip_partener CASCADE;
-- -- DROP TYPE IF EXISTS stare_factura CASCADE;
-- -- DROP TYPE IF EXISTS tip_document CASCADE;


-- -- ============================================================================
-- -- ENUMS
-- -- ============================================================================

-- CREATE TYPE tip_document AS ENUM (
--     'FiscalA',          -- Factură fiscală (tax invoice)
--     'ProformA',         -- Factură proformă (proforma invoice)
--     'NotaDeCredit',     -- Notă de credit / storno (credit note)
--     'Chitanta',         -- Chitanță (receipt)
--     'AvizDeExpeditie'   -- Aviz de expediție (delivery note)
-- );

-- CREATE TYPE stare_factura AS ENUM (
--     'Draft',     -- Being composed, not yet issued
--     'Emisa',     -- Issued / finalised
--     'Trimisa',   -- Sent to counterparty / submitted to ANAF mock
--     'Platita',   -- Payment received / settled
--     'Anulata'    -- Cancelled / voided
-- );

-- CREATE TYPE tip_partener AS ENUM (
--     'Client',    -- This entity is a buyer
--     'Furnizor',  -- This entity is a supplier
--     'Ambele'     -- Can appear as both
-- );

-- CREATE TYPE tip_entitate AS ENUM (
--     'PersoanaFizica',   -- Individual (Romanian citizen)
--     'PersoanaJuridica'  -- Legal entity (Romanian company)
-- );

-- CREATE TYPE cota_tva AS ENUM (
--     'Standard',   -- 19% — general goods & services
--     'Redusa9',    -- 9%  — food, pharma, books, hotel
--     'Redusa5',    -- 5%  — social housing, cultural services
--     'Scutit'      -- 0%  — VAT exempt
-- );


-- -- ============================================================================
-- -- PARTENER
-- -- Counterparty registry — clients and suppliers used on invoices.
-- -- Separate from the internal PF/PJ taxpayer records; a partener is an
-- -- external entity that a registered user invoices or receives invoices from.
-- -- Optionally linked to an internal PF/PJ if the counterparty is also a
-- -- registered TaxChain user.
-- -- ============================================================================

-- CREATE TABLE IF NOT EXISTS partener (
--     id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

--     -- -----------------------------------------------------------------------
--     -- Identity
--     -- -----------------------------------------------------------------------
--     denumire            VARCHAR(200)    NOT NULL,
--     cod_fiscal          VARCHAR(20),     -- CIF / CNP / foreign tax id (nullable for private individuals)
--     numar_reg_com       VARCHAR(20),     -- J##/######/## (nullable)

--     -- -----------------------------------------------------------------------
--     -- Classification
--     -- -----------------------------------------------------------------------
--     tip                 tip_partener    NOT NULL DEFAULT 'Ambele',
--     tip_entitate        tip_entitate    NOT NULL DEFAULT 'PersoanaJuridica',

--     -- -----------------------------------------------------------------------
--     -- Contact
--     -- -----------------------------------------------------------------------
--     adresa              VARCHAR(300),
--     cod_postal          VARCHAR(6),
--     oras                VARCHAR(100),
--     tara                VARCHAR(100)    NOT NULL DEFAULT 'Romania',
--     email               VARCHAR(100),
--     telefon             VARCHAR(20),
--     iban                VARCHAR(34),

--     -- -----------------------------------------------------------------------
--     -- Optional link to internal registered entity
--     -- -----------------------------------------------------------------------
--     persoana_fizica_id  UUID            REFERENCES persoana_fizica(id)   ON DELETE SET NULL,
--     persoana_juridica_id UUID           REFERENCES persoana_juridica(id) ON DELETE SET NULL,

--     -- -----------------------------------------------------------------------
--     -- Ownership — which user created this counterparty record
--     -- -----------------------------------------------------------------------
--     created_by          UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,

--     -- -----------------------------------------------------------------------
--     -- Audit
--     -- -----------------------------------------------------------------------
--     created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
--     updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
-- );


-- -- ============================================================================
-- -- FACTURA
-- -- Invoice header. One row per document regardless of type.
-- -- The document type determines which fields are meaningful (e.g. chitanta
-- -- does not have a due date; aviz de expeditie has no VAT).
-- -- ============================================================================

-- CREATE TABLE IF NOT EXISTS factura (
--     id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

--     -- -----------------------------------------------------------------------
--     -- Document identity
--     -- -----------------------------------------------------------------------
--     numar                   VARCHAR(50)     NOT NULL,   -- Invoice number, e.g. "FC-2025-001"
--     serie                   VARCHAR(20),                -- Optional series prefix, e.g. "FC"
--     tip_document            tip_document    NOT NULL DEFAULT 'FiscalA',
--     stare                   stare_factura   NOT NULL DEFAULT 'Draft',

--     -- -----------------------------------------------------------------------
--     -- Dates
--     -- -----------------------------------------------------------------------
--     data_emitere            DATE            NOT NULL DEFAULT CURRENT_DATE,
--     data_scadenta           DATE,           -- Due date — nullable (no due date for chitante)
--     data_livrare            DATE,           -- Delivery / service date (optional)

--     -- -----------------------------------------------------------------------
--     -- Emitent (issuer) — the internal TaxChain entity issuing this document.
--     -- Exactly one of these should be set (enforced at app layer).
--     -- -----------------------------------------------------------------------
--     emitent_pf_id           UUID            REFERENCES persoana_fizica(id)   ON DELETE SET NULL,
--     emitent_pj_id           UUID            REFERENCES persoana_juridica(id) ON DELETE SET NULL,

--     -- -----------------------------------------------------------------------
--     -- Partener (counterparty) — the external entity
--     -- -----------------------------------------------------------------------
--     partener_id             UUID            NOT NULL REFERENCES partener(id) ON DELETE RESTRICT,

--     -- -----------------------------------------------------------------------
--     -- Financial summary (denormalized for fast queries — recomputed on save)
--     -- -----------------------------------------------------------------------
--     moneda                  VARCHAR(3)      NOT NULL DEFAULT 'RON',
--     total_fara_tva          DECIMAL(15,2)   NOT NULL DEFAULT 0,
--     total_tva               DECIMAL(15,2)   NOT NULL DEFAULT 0,
--     total_cu_tva            DECIMAL(15,2)   NOT NULL DEFAULT 0,
--     suma_platita            DECIMAL(15,2)   NOT NULL DEFAULT 0,   -- partial payments
--     rest_de_plata           DECIMAL(15,2)   NOT NULL DEFAULT 0,   -- total_cu_tva - suma_platita

--     -- -----------------------------------------------------------------------
--     -- Document references
--     -- -----------------------------------------------------------------------
--     factura_referinta_id    UUID            REFERENCES factura(id) ON DELETE SET NULL,
--     -- ^ For credit notes: points to the invoice being credited
--     -- ^ For proforma: can point to a confirmed invoice once issued

--     -- -----------------------------------------------------------------------
--     -- Notes & metadata
--     -- -----------------------------------------------------------------------
--     observatii              TEXT,           -- Free-text notes
--     conditii_plata          VARCHAR(200),   -- Payment terms

--     -- -----------------------------------------------------------------------
--     -- Ownership
--     -- -----------------------------------------------------------------------
--     created_by              UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,

--     -- -----------------------------------------------------------------------
--     -- Audit
--     -- -----------------------------------------------------------------------
--     created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
--     updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

--     -- -----------------------------------------------------------------------
--     -- Constraints
--     -- -----------------------------------------------------------------------
--     CONSTRAINT chk_emitent_set
--         CHECK (emitent_pf_id IS NOT NULL OR emitent_pj_id IS NOT NULL),
--     CONSTRAINT chk_totals_non_negative
--         CHECK (total_fara_tva >= 0 AND total_tva >= 0 AND total_cu_tva >= 0),
--     CONSTRAINT chk_suma_platita_non_negative
--         CHECK (suma_platita >= 0),
--     CONSTRAINT chk_unique_numar_per_emitent_pj
--         UNIQUE NULLS NOT DISTINCT (numar, emitent_pj_id),
--     CONSTRAINT chk_unique_numar_per_emitent_pf
--         UNIQUE NULLS NOT DISTINCT (numar, emitent_pf_id)
-- );


-- -- ============================================================================
-- -- FACTURA_LINIE
-- -- Line items for each invoice. Each row is one product/service line.
-- -- VAT is computed per-line and rolled up into the factura totals.
-- -- ============================================================================

-- CREATE TABLE IF NOT EXISTS factura_linie (
--     id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
--     factura_id          UUID            NOT NULL REFERENCES factura(id) ON DELETE CASCADE,

--     -- -----------------------------------------------------------------------
--     -- Line identity
--     -- -----------------------------------------------------------------------
--     pozitie             SMALLINT        NOT NULL DEFAULT 1,  -- ordering within invoice
--     denumire            VARCHAR(300)    NOT NULL,            -- product/service description
--     cod_produs          VARCHAR(100),                        -- optional SKU / product code
--     um                  VARCHAR(20)     NOT NULL DEFAULT 'buc',  -- unit of measure

--     -- -----------------------------------------------------------------------
--     -- Quantities & pricing
--     -- -----------------------------------------------------------------------
--     cantitate           DECIMAL(15,4)   NOT NULL,
--     pret_unitar         DECIMAL(15,4)   NOT NULL,            -- unit price WITHOUT VAT
--     discount_procent    DECIMAL(5,2)    NOT NULL DEFAULT 0,  -- 0–100 percent discount

--     -- -----------------------------------------------------------------------
--     -- VAT
--     -- -----------------------------------------------------------------------
--     cota_tva            cota_tva        NOT NULL DEFAULT 'Standard',

--     -- -----------------------------------------------------------------------
--     -- Computed totals (denormalized — set by application on each write)
--     -- -----------------------------------------------------------------------
--     valoare_fara_tva    DECIMAL(15,2)   NOT NULL DEFAULT 0,  -- cantitate * pret_unitar * (1 - discount/100)
--     valoare_tva         DECIMAL(15,2)   NOT NULL DEFAULT 0,  -- valoare_fara_tva * cota_tva%
--     valoare_cu_tva      DECIMAL(15,2)   NOT NULL DEFAULT 0,  -- valoare_fara_tva + valoare_tva

--     -- -----------------------------------------------------------------------
--     -- Audit
--     -- -----------------------------------------------------------------------
--     created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
--     updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

--     CONSTRAINT chk_cantitate_positive   CHECK (cantitate > 0),
--     CONSTRAINT chk_pret_non_negative    CHECK (pret_unitar >= 0),
--     CONSTRAINT chk_discount_range       CHECK (discount_procent >= 0 AND discount_procent <= 100)
-- );


-- -- ============================================================================
-- -- INDEXES
-- -- ============================================================================

-- -- partener
-- CREATE INDEX idx_partener_created_by    ON partener(created_by);
-- CREATE INDEX idx_partener_cod_fiscal    ON partener(cod_fiscal) WHERE cod_fiscal IS NOT NULL;

-- -- factura
-- CREATE INDEX idx_factura_emitent_pf     ON factura(emitent_pf_id) WHERE emitent_pf_id IS NOT NULL;
-- CREATE INDEX idx_factura_emitent_pj     ON factura(emitent_pj_id) WHERE emitent_pj_id IS NOT NULL;
-- CREATE INDEX idx_factura_partener_id    ON factura(partener_id);
-- CREATE INDEX idx_factura_stare          ON factura(stare);
-- CREATE INDEX idx_factura_data_emitere   ON factura(data_emitere DESC);
-- CREATE INDEX idx_factura_created_by     ON factura(created_by);

-- -- factura_linie
-- CREATE INDEX idx_factura_linie_factura_id ON factura_linie(factura_id);


-- SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname;

-- SELECT table_name FROM information_schema.tables
--     WHERE table_schema = 'public'
--     ORDER BY table_name;

-- SELECT column_name, data_type, is_nullable
--     FROM information_schema.columns
--     WHERE table_name = 'factura'
--     ORDER BY ordinal_position;

-- ALTER TABLE partener
-- RENAME COLUMN numar_reg_com TO numar_in_registrul_comertului;