-- persoane_fizice migration (same as before)
DO $$ BEGIN
    CREATE TYPE tip_persoana_fizica AS ENUM('PFA', 'II', 'IF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tip_dovada AS ENUM(
        'contract_de_proprietate', 'contract_de_comodat', 
        'contract_de_inchiriere', 'alte_tipuri'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE stare_fiscala AS ENUM('activ', 'inactiv', 'suspendat', 'radiat');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS persoane_fizice (
    uuid                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tip                       tip_persoana_fizica NOT NULL DEFAULT 'PFA',
    reprezentant_uuid         UUID NOT NULL REFERENCES reprezentanti(uuid) ON DELETE RESTRICT,

    -- === IDENTIFICARE ===
    cnp_hash                  TEXT NOT NULL,                    
    nume                      TEXT NOT NULL,
    prenume                   TEXT NOT NULL,
    serie_act_identitate      TEXT NOT NULL,
    numar_act_identitate      TEXT NOT NULL,
    data_nasterii             DATE NOT NULL,
    cetatenie                 TEXT NOT NULL DEFAULT 'Română',

    adresa_domiciliu_uuid     UUID NOT NULL REFERENCES address(uuid) ON DELETE RESTRICT,
    dovada_drept_folosinta    tip_dovada,

    -- === ÎNREGISTRĂRI FISCALE & RC ===
    cod_caen                  TEXT,                              
    data_inregistrarii        DATE,
    euid                      TEXT UNIQUE,                       
    nr_ordine_reg_comert      TEXT UNIQUE,                       

    platitor_tva              BOOLEAN NOT NULL DEFAULT false,

    stare_fiscala             stare_fiscala NOT NULL DEFAULT 'activ',
    inregistrat_in_spv        BOOLEAN NOT NULL DEFAULT false,

    created_at                TIMESTAMPTZ DEFAULT NOW(),
    updated_at                TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(cnp_hash),
    UNIQUE(reprezentant_uuid, tip),
    CHECK (tip = 'PFA' OR cod_caen IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_persoane_fizice_cnp_hash       ON persoane_fizice(cnp_hash);
CREATE INDEX IF NOT EXISTS idx_persoane_fizice_nume           ON persoane_fizice(nume, prenume);
CREATE INDEX IF NOT EXISTS idx_persoane_fizice_nr_reg_comert  ON persoane_fizice(nr_ordine_reg_comert) WHERE nr_ordine_reg_comert IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_persoane_fizice_euid           ON persoane_fizice(euid) WHERE euid IS NOT NULL;
