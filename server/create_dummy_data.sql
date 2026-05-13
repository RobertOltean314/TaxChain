-- ============================================================================
-- HELPER FUNCTIONS FOR GENERATING VALID DATA
-- ============================================================================

-- Function to generate valid Romanian CNP (Personal Identification Number)
CREATE OR REPLACE FUNCTION generate_cnp(p_sex sex, p_birth_date date, p_county int) RETURNS varchar AS $$
DECLARE
  s char;
  aa varchar(2);
  ll varchar(2);
  zz varchar(2);
  jj varchar(2);
  nnn varchar(3);
  base varchar(12);
  digits int[];
  weights int[] := '{2,7,9,1,4,6,3,5,8,2,7,9}';
  sum int := 0;
  i int;
  c int;
BEGIN
  -- Determine S based on sex and birth year
  IF extract(year from p_birth_date) < 2000 THEN
    s := CASE p_sex WHEN 'M'::sex THEN '1' ELSE '2' END;
  ELSE
    s := CASE p_sex WHEN 'M'::sex THEN '5' ELSE '6' END;
  END IF;
  
  aa := lpad((extract(year from p_birth_date) % 100)::text, 2, '0');
  ll := lpad(extract(month from p_birth_date)::text, 2, '0');
  zz := lpad(extract(day from p_birth_date)::text, 2, '0');
  jj := lpad(p_county::text, 2, '0');
  nnn := lpad((trunc(random() * 999) + 1)::int::text, 3, '0');
  
  base := s || aa || ll || zz || jj || nnn;
  
  digits := string_to_array(base, NULL)::int[];
  
  FOR i IN 1..12 LOOP
    sum := sum + digits[i] * weights[i];
  END LOOP;
  
  c := sum % 11;
  IF c = 10 THEN c := 1; END IF;
  
  RETURN base || c::text;
END;
$$ LANGUAGE plpgsql;

-- Function to generate valid Romanian IBAN
CREATE OR REPLACE FUNCTION generate_iban(p_bank varchar(4)) RETURNS varchar AS $$
DECLARE
  account varchar(16);
  temp varchar;
  num_str varchar := '';
  ch char;
  mod97 int := 0;
  check_digit int;
BEGIN
  account := lpad((trunc(random() * 10000000000000000)::bigint)::text, 16, '0');
  temp := p_bank || account || 'RO00';
  
  -- Build numeric string (letters to numbers)
  FOREACH ch IN ARRAY string_to_array(upper(temp), NULL) LOOP
    IF ch ~ '[0-9]' THEN
      num_str := num_str || ch;
    ELSE
      num_str := num_str || (ascii(ch) - ascii('A') + 10)::text;
    END IF;
  END LOOP;
  
  -- Compute mod 97 iteratively
  mod97 := 0;
  FOREACH ch IN ARRAY string_to_array(num_str, NULL) LOOP
    mod97 := (mod97 * 10 + (ascii(ch) - ascii('0'))) % 97;
  END LOOP;
  
  check_digit := 98 - mod97;
  
  RETURN 'RO' || lpad(check_digit::text, 2, '0') || p_bank || account;
END;
$$ LANGUAGE plpgsql;

-- Function to generate valid Romanian Tax ID (Cod Fiscal)
CREATE OR REPLACE FUNCTION generate_cod_fiscal() RETURNS varchar AS $$
DECLARE
  base varchar(9);
  digits int[];
  weights int[] := '{7,5,3,1,7,5,3,1}';
  sum int := 0;
  i int;
  c int;
BEGIN
  base := lpad((trunc(random() * 999999999) + 1)::int::text, 9, '0');
  digits := string_to_array(base, NULL)::int[];
  
  FOR i IN 1..8 LOOP
    sum := sum + digits[i] * weights[i];
  END LOOP;
  
  c := sum % 11;
  IF c = 10 THEN c := 0; END IF;
  
  RETURN base || c::text;
END;
$$ LANGUAGE plpgsql;

-- Function to generate valid Romanian Trade Register Number (format: J##/######/##)
CREATE OR REPLACE FUNCTION generate_trade_register() RETURNS varchar AS $$
BEGIN
  -- Format: J + 2 digits (county) + / + 6 digits (sequence) + / + 2 digits (year)
  -- Total: 14 characters exactly (J##/######/##)
  RETURN 'J' || 
         lpad((trunc(random() * 52) + 1)::int::text, 2, '0') || '/' ||
         lpad((trunc(random() * 999999) + 1)::int::text, 6, '0') || '/' ||
         lpad((extract(year from CURRENT_DATE)::int % 100)::text, 2, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEAN UP EXISTING DATA (if needed - uncomment to use)
-- ============================================================================

-- DELETE FROM reprezentanti_persoana_juridica;
-- DELETE FROM persoana_juridica;
-- DELETE FROM persoana_fizica;

-- ============================================================================
-- 1. INSERT 100 DUMMY ENTRIES FOR PERSOANA_FIZICA
-- ============================================================================

WITH random_data AS (
    SELECT
        DATE '1960-01-01' + (trunc(random() * 23000)::int) AS data_nasterii,
        (ARRAY['M'::sex,'F'::sex])[trunc(random() * 2 + 1)::int] AS sex,
        trunc(random() * 46 + 1)::int AS county,
        (ARRAY['Popescu','Ionescu','Dumitrescu','Georgescu','Radu','Stan','Marin','Preda','Vasilescu','Stoica','Mihai','Alexandru','Vasile','Popa','Cristescu','Moldovan','Ene','Costin','Dragomir','Balan']::text[])[trunc(random() * 20 + 1)::int] AS nume,
        (ARRAY['Ion','Maria','Andrei','Elena','Mihai','Ioana','Alex','Ana','Gabriel','Cristina','Florin','Sorina','Bogdan','Laura','Vlad','Silvia','Adrian','Roxana','Marius','Daniela']::text[])[trunc(random() * 20 + 1)::int] AS prenume,
        (ARRAY['Gheorghe','Alexandru','Vasile','Ion','Mihai','Florin','Constantin','Petre','Marian','Nicolae','Grigore','Doru','Viorel','Nicu','Rares','Dorin','Sandu','Cornel','Eduard','Cristian']::text[])[trunc(random() * 20 + 1)::int] AS prenume_tata,
        'Str. ' || (ARRAY['Libertatii','Eminescu','Revolutiei','Stefan cel Mare','Unirii','Bucuresti','Mihai Viteazul','George Cosbuc','Pastravului','Vasile Alecsandri','Aleea Cornestierii','Carpatilor','Dacia','Gheorghe Sincai','Gheorghe Titeica']::text[])[trunc(random() * 15 + 1)::int] || 
        ' Nr. ' || (trunc(random()*100 + 1)::int) || ', ' ||
        (ARRAY['Bucuresti','Cluj-Napoca','Timisoara','Iasi','Brasov','Constanta','Craiova','Sibiu','Oradea','Ploiesti','Galati','Bacau','Satu Mare','Drobeta','Targu Mures']::text[])[trunc(random() * 15 + 1)::int] AS adresa_domiciliu,
        lpad((trunc(random()*900000 + 100000)::int)::text, 6, '0') AS cod_postal,
        (ARRAY['BTRL','RNCB','INGB','BRDE','CARP','EXIM','OTPV','BREL','PIRB','UGBI']::text[])[trunc(random()*10+1)::int] AS bank_code,
        '07' || lpad((trunc(random()*100000000)::int)::text,8,'0') AS telefon,
        LOWER(
            (ARRAY['Ion','Maria','Andrei','Elena','Mihai','Ioana','Alex','Ana','Gabriel','Cristina']::text[])[trunc(random() * 10 + 1)::int] || '.' ||
            (ARRAY['Popescu','Ionescu','Dumitrescu','Georgescu','Radu','Stan','Marin','Preda','Vasilescu','Stoica']::text[])[trunc(random() * 10 + 1)::int] || 
            '@' || (ARRAY['gmail.com','yahoo.com','outlook.com','example.ro','mail.com']::text[])[trunc(random() * 5 + 1)::int]
        ) AS email,
        (ARRAY['Activ'::stare_persoana_fizica,'Activ'::stare_persoana_fizica,'Activ'::stare_persoana_fizica,'Activ'::stare_persoana_fizica,'Activ'::stare_persoana_fizica,'Activ'::stare_persoana_fizica,'Activ'::stare_persoana_fizica,'Inactiv'::stare_persoana_fizica,'Suspendat'::stare_persoana_fizica])[trunc(random() * 9 + 1)::int] AS stare,
        '0x' || substr(md5(random()::text || random()::text || clock_timestamp()::text), 1, 40) AS wallet
    FROM generate_series(1,100)
)
INSERT INTO persoana_fizica (
    cnp,
    nume,
    prenume,
    prenume_tata,
    data_nasterii,
    sex,
    adresa_domiciliu,
    cod_postal,
    iban,
    telefon,
    email,
    stare,
    wallet
)
SELECT
    generate_cnp(sex, data_nasterii, county) AS cnp,
    nume,
    prenume,
    prenume_tata,
    data_nasterii,
    sex,
    adresa_domiciliu,
    cod_postal,
    generate_iban(bank_code) AS iban,
    telefon,
    email,
    stare,
    wallet
FROM random_data;

-- ============================================================================
-- 2. INSERT 100 DUMMY ENTRIES FOR PERSOANA_JURIDICA
-- ============================================================================

WITH random_data AS (
    SELECT
        generate_cod_fiscal() AS cod_fiscal,
        (ARRAY['SRL','SNC','SA','PFA','ONG','Cooperative','Fundatie','Asociatie']::text[])[trunc(random() * 8 + 1)::int] || ' ' ||
        (ARRAY['Solutions','Systems','Tech','Digital','Consulting','Services','Group','Company','Industries','Enterprise']::text[])[trunc(random() * 10 + 1)::int] AS denumire,
        generate_trade_register() AS numar_de_inregistrare,
        (trunc(random() * 120) + 1904)::int AS an_infiintare,
        'Str. ' || (ARRAY['Libertatii','Eminescu','Revolutiei','Stefan cel Mare','Unirii','Bucuresti','Mihai Viteazul','George Cosbuc','Pastravului','Vasile Alecsandri','Aleea Cornestierii','Carpatilor','Dacia','Gheorghe Sincai','Gheorghe Titeica']::text[])[trunc(random() * 15 + 1)::int] || 
        ' Nr. ' || (trunc(random()*100 + 1)::int) || ', ' ||
        (ARRAY['Bucuresti','Cluj-Napoca','Timisoara','Iasi','Brasov','Constanta','Craiova','Sibiu','Oradea','Ploiesti','Galati','Bacau','Satu Mare','Drobeta','Targu Mures']::text[])[trunc(random() * 15 + 1)::int] AS adresa_sediu,
        lpad((trunc(random()*900000 + 100000)::int)::text, 6, '0') AS cod_postal,
        ARRAY[
            'Str. Exemple Nr. 1, Cluj',
            'Str. Test Nr. 2, Bucuresti',
            'Str. Demo Nr. 3, Timisoara'
        ]::text[] AS adresa_puncte,
        (ARRAY['BTRL','RNCB','INGB','BRDE','CARP','EXIM','OTPV','BREL','PIRB','UGBI']::text[])[trunc(random()*10+1)::int] AS bank_code,
        '02' || lpad((trunc(random()*100000000)::int)::text,8,'0') AS telefon,
        LOWER(
            (ARRAY['contact','info','office','business','admin']::text[])[trunc(random() * 5 + 1)::int] || '@' ||
            (ARRAY['company','enterprise','services','group','solutions']::text[])[trunc(random() * 5 + 1)::int] || 
            '.ro'
        ) AS email,
        (ARRAY['4711','6202','6410','6420','6511','6512','6513','6520','7010','7020']::text[])[trunc(random() * 10 + 1)::int] AS cod_caen_principal,
        ARRAY['6110','6130','6190']::text[] AS coduri_caen_secundare,
        trunc(random() * 500 + 1)::int AS numar_angajati,
        (trunc(random() * 1000000) + 10000)::decimal(15, 2) AS capital_social,
        (ARRAY['Activa'::stare_persoana_juridica,'Activa'::stare_persoana_juridica,'Activa'::stare_persoana_juridica,'Activa'::stare_persoana_juridica,'Activa'::stare_persoana_juridica,'Radiata'::stare_persoana_juridica,'Suspendata'::stare_persoana_juridica,'In insolventa'::stare_persoana_juridica])[trunc(random() * 8 + 1)::int] AS stare,
        '0x' || substr(md5(random()::text || random()::text || clock_timestamp()::text), 1, 40) AS wallet
    FROM generate_series(1,100)
)
INSERT INTO persoana_juridica (
    cod_fiscal,
    denumire,
    numar_de_inregistrare_in_registrul_comertului,
    an_infiintare,
    adresa_sediu_social,
    cod_postal,
    adresa_puncte_de_lucru,
    iban,
    telefon,
    email,
    cod_caen_principal,
    coduri_caen_secundare,
    numar_angajati,
    capital_social,
    stare,
    wallet
)
SELECT
    cod_fiscal,
    denumire,
    numar_de_inregistrare,
    an_infiintare,
    adresa_sediu,
    cod_postal,
    adresa_puncte,
    generate_iban(bank_code) AS iban,
    telefon,
    email,
    cod_caen_principal,
    coduri_caen_secundare,
    numar_angajati,
    capital_social,
    stare,
    wallet
FROM random_data;

-- ============================================================================
-- 3. INSERT 100+ DUMMY ENTRIES FOR REPREZENTANTI_PERSOANA_JURIDICA
-- ============================================================================
-- This table links persoana_fizica with persoana_juridica
-- IMPORTANT: Only references people that actually exist in persoana_fizica
-- We'll create ~200 relationships (each juridical person gets 1-3 random representatives)

WITH numbered_persons AS (
    -- Get all existing persoana_fizica with row numbers for random selection
    SELECT 
        id,
        row_number() OVER (ORDER BY id) AS rn
    FROM persoana_fizica
),
numbered_companies AS (
    -- Get all existing persoana_juridica with row numbers
    SELECT 
        id,
        row_number() OVER (ORDER BY id) AS rn
    FROM persoana_juridica
),
company_representatives AS (
    -- For each company, assign 1-3 random people from persoana_fizica as representatives
    SELECT
        j.id AS persoana_juridica_id,
        f.id AS persoana_fizica_id,
        (ARRAY[
            'Administrator'::functie_reprezentant,
            'Director General'::functie_reprezentant,
            'Director Executiv'::functie_reprezentant,
            'Presedinte'::functie_reprezentant,
            'Vicepresedinte'::functie_reprezentant,
            'Asociat'::functie_reprezentant,
            'Actionar'::functie_reprezentant,
            'Manager'::functie_reprezentant
        ])[(((j.rn + f.rn) % 8) + 1)::int] AS functie,
        DATE '2010-01-01' + (((j.rn * 7 + f.rn * 11) % 5475)::int) AS data_numire,
        CASE 
            WHEN ((j.rn + f.rn) % 10) < 1 THEN DATE '2010-01-01' + (((j.rn * 13 + f.rn * 17) % 5475)::int)
            ELSE NULL 
        END AS data_incetare
    FROM numbered_companies j
    CROSS JOIN numbered_persons f
    WHERE (j.rn + f.rn) % 50 < 3  -- Each company gets ~2-3 random representatives
)
INSERT INTO reprezentanti_persoana_juridica (
    persoana_juridica_id,
    persoana_fizica_id,
    functie,
    data_numire,
    data_incetare
)
SELECT DISTINCT ON (persoana_juridica_id, persoana_fizica_id, functie)
    persoana_juridica_id,
    persoana_fizica_id,
    functie,
    data_numire,
    data_incetare
FROM company_representatives
-- Ensure data_incetare is after data_numire if it exists
WHERE data_incetare IS NULL OR data_incetare > data_numire;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- SELECT COUNT(*) AS "Total persoana_fizica" FROM persoana_fizica;
-- SELECT COUNT(*) AS "Total persoana_juridica" FROM persoana_juridica;
-- SELECT COUNT(*) AS "Total reprezentanti" FROM reprezentanti_persoana_juridica;

-- -- Display sample data from each table
-- SELECT 'Sample data from persoana_fizica' AS section;
-- SELECT id, cnp, nume, prenume, email, stare, sex FROM persoana_fizica LIMIT 5;

-- SELECT 'Sample data from persoana_juridica' AS section;
-- SELECT id, cod_fiscal, denumire, numar_angajati, capital_social, stare FROM persoana_juridica LIMIT 5;

-- SELECT 'Sample data from reprezentanti_persoana_juridica' AS section;
-- SELECT id, persoana_juridica_id, persoana_fizica_id, functie, data_numire FROM reprezentanti_persoana_juridica LIMIT 5;