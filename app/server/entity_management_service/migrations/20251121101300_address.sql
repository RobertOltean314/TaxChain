-- Add migration script here
CREATE TABLE IF NOT EXISTS address (
    uuid uuid primary key default gen_random_uuid(),

    tara text not null default 'Romania',
    judet text not null,
    localitate text not null,
    cod_postal text,
    strada text not null,
    numar text not null,
    bloc text,
    scara text,
    etaj text,
    apartament text,
    detalii text,

    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()  
);

CREATE INDEX IF NOT EXISTS idx_address_localitate ON address(localitate);
CREATE INDEX IF NOT EXISTS idx_address_judet ON address(judet);