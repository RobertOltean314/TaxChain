-- reprezentanti migration
CREATE TYPE tip_act_identitate AS ENUM ('carte_identitate', 'pasaport', 'permis_de_conducere');
CREATE TYPE calitate_reprezentant AS ENUM ('proprietar','administrator', 'mandatar', 'alt_reprezentant');

CREATE TABLE IF NOT EXISTS reprezentanti (
    uuid uuid primary key default gen_random_uuid(),

    -- persoana_fizica || persoana_juridica || etc...
    parent_id uuid not null,
    parent_type text not null,

    -- date de contact si identificare
    nume text not null,
    prenume text not null,
    cnp text not null,
    tip_act_identitate tip_act_identitate not null,
    serie_act_identitate text not null,
    numar_act_identitate text not null,
    calitate calitate_reprezentant not null,
    telefon text not null,
    email text not null, 
    data_nasterii date not null,

    -- FK catre adresa de domiciliu
    adresa_domiciliu uuid not null references address(uuid),

    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),

    unique(parent_id, parent_type, cnp)
);

CREATE INDEX idx_reprezentanti_parent on reprezentanti(parent_type, parent_id);
CREATE INDEX idx_reprezentanti_cnp on reprezentanti(cnp);
CREATE INDEX idx_reprezentanti_email on reprezentanti(email);
CREATE INDEX idx_reprezentanti_adresa on reprezentanti(adresa_domiciliu);