-- ============================================================================
-- TAXCHAIN — INVOICE MANAGEMENT (Phase 5)
-- Tables: partener, factura, factura_linie
-- ============================================================================

-- ENUMS
CREATE TYPE tip_document AS ENUM (
    'FiscalA',
    'ProformA',
    'NotaDeCredit',
    'Chitanta',
    'AvizDeExpeditie'
);

CREATE TYPE stare_factura AS ENUM (
    'Draft',
    'Emisa',
    'Trimisa',
    'Platita',
    'Anulata'
);

CREATE TYPE tip_partener AS ENUM (
    'Client',
    'Furnizor',
    'Ambele'
);

CREATE TYPE tip_entitate AS ENUM (
    'PersoanaFizica',
    'PersoanaJuridica'
);

CREATE TYPE cota_tva AS ENUM (
    'Standard',
    'Redusa9',
    'Redusa5',
    'Scutit'
);

-- PARTENER TABLE
CREATE TABLE IF NOT EXISTS partener (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    denumire            VARCHAR(200)    NOT NULL,
    cod_fiscal          VARCHAR(20),
    numar_in_registrul_comertului VARCHAR(20),
    
    -- Classification
    tip                 tip_partener    NOT NULL DEFAULT 'Ambele',
    tip_entitate        tip_entitate    NOT NULL DEFAULT 'PersoanaJuridica',
    
    -- Contact
    adresa              VARCHAR(300),
    cod_postal          VARCHAR(6),
    oras                VARCHAR(100),
    tara                VARCHAR(100)    NOT NULL DEFAULT 'Romania',
    email               VARCHAR(100),
    telefon             VARCHAR(20),
    iban                VARCHAR(34),
    
    -- Optional link to internal entity
    persoana_fizica_id  UUID            REFERENCES persoana_fizica(id)   ON DELETE SET NULL,
    persoana_juridica_id UUID           REFERENCES persoana_juridica(id) ON DELETE SET NULL,
    
    -- Ownership
    created_by          UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Audit
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- FACTURA TABLE
CREATE TABLE IF NOT EXISTS factura (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Document identity
    numar                   VARCHAR(50)     NOT NULL,
    serie                   VARCHAR(20),
    tip_document            tip_document    NOT NULL DEFAULT 'FiscalA',
    stare                   stare_factura   NOT NULL DEFAULT 'Draft',
    
    -- Dates
    data_emitere            DATE            NOT NULL DEFAULT CURRENT_DATE,
    data_scadenta           DATE,
    data_livrare            DATE,
    
    -- Emitent (issuer)
    emitent_pf_id           UUID            REFERENCES persoana_fizica(id)   ON DELETE SET NULL,
    emitent_pj_id           UUID            REFERENCES persoana_juridica(id) ON DELETE SET NULL,
    
    -- Partener (counterparty)
    partener_id             UUID            NOT NULL REFERENCES partener(id) ON DELETE RESTRICT,
    
    -- Financial summary
    moneda                  VARCHAR(3)      NOT NULL DEFAULT 'RON',
    total_fara_tva          DECIMAL(15,2)   NOT NULL DEFAULT 0,
    total_tva               DECIMAL(15,2)   NOT NULL DEFAULT 0,
    total_cu_tva            DECIMAL(15,2)   NOT NULL DEFAULT 0,
    suma_platita            DECIMAL(15,2)   NOT NULL DEFAULT 0,
    rest_de_plata           DECIMAL(15,2)   NOT NULL DEFAULT 0,
    
    -- Document references
    factura_referinta_id    UUID            REFERENCES factura(id) ON DELETE SET NULL,
    
    -- Notes & metadata
    observatii              TEXT,
    conditii_plata          VARCHAR(200),
    
    -- Ownership
    created_by              UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Audit
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_emitent_set
        CHECK (emitent_pf_id IS NOT NULL OR emitent_pj_id IS NOT NULL),
    CONSTRAINT chk_totals_non_negative
        CHECK (total_fara_tva >= 0 AND total_tva >= 0 AND total_cu_tva >= 0),
    CONSTRAINT chk_suma_platita_non_negative
        CHECK (suma_platita >= 0),
    CONSTRAINT chk_unique_numar_per_emitent_pj
        UNIQUE NULLS NOT DISTINCT (numar, emitent_pj_id),
    CONSTRAINT chk_unique_numar_per_emitent_pf
        UNIQUE NULLS NOT DISTINCT (numar, emitent_pf_id)
);

-- FACTURA_LINIE TABLE
CREATE TABLE IF NOT EXISTS factura_linie (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    factura_id          UUID            NOT NULL REFERENCES factura(id) ON DELETE CASCADE,
    
    -- Line identity
    pozitie             SMALLINT        NOT NULL DEFAULT 1,
    denumire            VARCHAR(300)    NOT NULL,
    cod_produs          VARCHAR(100),
    um                  VARCHAR(20)     NOT NULL DEFAULT 'buc',
    
    -- Quantities & pricing
    cantitate           DECIMAL(15,4)   NOT NULL,
    pret_unitar         DECIMAL(15,4)   NOT NULL,
    discount_procent    DECIMAL(5,2)    NOT NULL DEFAULT 0,
    
    -- VAT
    cota_tva            cota_tva        NOT NULL DEFAULT 'Standard',
    
    -- Computed totals
    valoare_fara_tva    DECIMAL(15,2)   NOT NULL DEFAULT 0,
    valoare_tva         DECIMAL(15,2)   NOT NULL DEFAULT 0,
    valoare_cu_tva      DECIMAL(15,2)   NOT NULL DEFAULT 0,
    
    -- Audit
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_cantitate_positive   CHECK (cantitate > 0),
    CONSTRAINT chk_pret_non_negative    CHECK (pret_unitar >= 0),
    CONSTRAINT chk_discount_range       CHECK (discount_procent >= 0 AND discount_procent <= 100)
);

-- INDEXES
CREATE INDEX idx_partener_created_by    ON partener(created_by);
CREATE INDEX idx_partener_cod_fiscal    ON partener(cod_fiscal) WHERE cod_fiscal IS NOT NULL;

CREATE INDEX idx_factura_emitent_pf     ON factura(emitent_pf_id) WHERE emitent_pf_id IS NOT NULL;
CREATE INDEX idx_factura_emitent_pj     ON factura(emitent_pj_id) WHERE emitent_pj_id IS NOT NULL;
CREATE INDEX idx_factura_partener_id    ON factura(partener_id);
CREATE INDEX idx_factura_stare          ON factura(stare);
CREATE INDEX idx_factura_data_emitere   ON factura(data_emitere DESC);
CREATE INDEX idx_factura_created_by     ON factura(created_by);

CREATE INDEX idx_factura_linie_factura_id ON factura_linie(factura_id);