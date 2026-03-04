-- -- ENUMS

-- DROP TYPE IF EXISTS functie_reprezentant CASCADE;
-- CREATE TYPE functie_reprezentant AS ENUM (
--     'Administrator',
--     'Director General',
--     'Director Executiv',
--     'Presedinte',
--     'Vicepresedinte',
--     'Asociat',
--     'Actionar',
--     'Manager'
-- );

-- -- TABLES

-- DROP TABLE IF EXISTS reprezentanti_persoana_juridica CASCADE;
-- DROP TABLE IF EXISTS persoana_juridica CASCADE;
-- DROP TABLE IF EXISTS persoana_fizica CASCADE;

-- CREATE TABLE IF NOT EXISTS persoana_fizica (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     cnp VARCHAR(13) NOT NULL UNIQUE,
--     nume VARCHAR(50) NOT NULL,
--     prenume VARCHAR(50) NOT NULL,
--     prenume_tata VARCHAR(30),
--     data_nasterii DATE NOT NULL,
--     sex CHAR(1) NOT NULL CHECK (sex IN ('M', 'F')),
--     adresa_domiciliu VARCHAR(200) NOT NULL,
--     cod_postal VARCHAR(6),
--     iban VARCHAR(34) UNIQUE CHECK (iban ~ '^[A-Z0-9]+$' AND char_length(iban) BETWEEN 15 AND 34),
--     telefon VARCHAR(15) CHECK (telefon ~ '^[0-9]+$'),
--     email VARCHAR(100) CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
--     stare VARCHAR(20) DEFAULT 'Activ' CHECK (stare IN ('Activ', 'Inactiv', 'Suspendat')),
--     wallet VARCHAR(100),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE TABLE IF NOT EXISTS persoana_juridica (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     cod_fiscal VARCHAR(10) NOT NULL UNIQUE,
--     denumire VARCHAR(100) NOT NULL,
--     numar_de_inregistrare_in_registrul_comertului VARCHAR(14) UNIQUE,
--     an_infiintare INTEGER NOT NULL CHECK (an_infiintare >= 1850 AND an_infiintare <= EXTRACT(YEAR FROM CURRENT_DATE)),
--     adresa_sediu_social VARCHAR(200) NOT NULL,
--     cod_postal VARCHAR(6),
--     adresa_puncte_de_lucru TEXT[], 
--     iban VARCHAR(34) UNIQUE CHECK (iban ~ '^[A-Z0-9]+$' AND char_length(iban) BETWEEN 15 AND 34),
--     telefon VARCHAR(15) CHECK (telefon ~ '^[0-9]+$'),
--     email VARCHAR(100) CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
--     cod_caen_principal VARCHAR(10) NOT NULL,
--     coduri_caen_secundare VARCHAR(10)[], 
--     numar_angajati INTEGER CHECK (numar_angajati >= 0),
--     capital_social DECIMAL(15, 2) NOT NULL CHECK (capital_social >= 0),
--     stare VARCHAR(20) DEFAULT 'Activa' CHECK (stare IN ('Activa', 'Radiata', 'Suspendata', 'In insolventa')),
--     wallet VARCHAR(100),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE TABLE IF NOT EXISTS reprezentanti_persoana_juridica (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     persoana_juridica_id UUID NOT NULL REFERENCES persoana_juridica(id) ON DELETE CASCADE,
--     persoana_fizica_id UUID NOT NULL REFERENCES persoana_fizica(id) ON DELETE CASCADE,
--     functie functie_reprezentant NOT NULL,
--     data_numire DATE NOT NULL,
--     data_incetare DATE,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     UNIQUE(persoana_juridica_id, persoana_fizica_id, functie)
-- );

-- -- QUERIES

SELECT * FROM persoana_fizica;
SELECT * FROM persoana_juridica;