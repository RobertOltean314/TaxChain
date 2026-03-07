-- First, create helper functions for generating valid CNP and IBAN (unchanged)

CREATE OR REPLACE FUNCTION generate_cnp(p_sex char, p_birth_date date, p_county int) RETURNS varchar AS $$
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
    s := CASE p_sex WHEN 'M' THEN '1' ELSE '2' END;
  ELSE
    s := CASE p_sex WHEN 'M' THEN '5' ELSE '6' END;
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

-- Drop old entries (use TRUNCATE for faster reset if no foreign keys; otherwise DELETE)
DELETE FROM persoana_fizica;
-- Alternatively: TRUNCATE TABLE persoana_fizica RESTART IDENTITY;

-- Insert 100 new dummy entries with valid CNP, IBAN, and telefon (digits only to match schema check)
WITH random_data AS (
    SELECT
        DATE '1960-01-01' + (trunc(random() * 23000)::int) AS data_nasterii,
        (ARRAY['M','F']::char[])[trunc(random() * 2 + 1)::int] AS sex,
        trunc(random() * 46 + 1)::int AS county,
        (ARRAY['Popescu','Ionescu','Dumitrescu','Georgescu','Radu','Stan','Marin','Preda','Vasilescu','Stoica']::text[])[trunc(random() * 10 + 1)::int] AS nume,
        (ARRAY['Ion','Maria','Andrei','Elena','Mihai','Ioana','Alex','Ana','Gabriel','Cristina']::text[])[trunc(random() * 10 + 1)::int] AS prenume,
        (ARRAY['Gheorghe','Alexandru','Vasile','Ion','Mihai','Florin','Constantin','Petre','Marian','Nicolae']::text[])[trunc(random() * 10 + 1)::int] AS prenume_tata,
        'Str. ' || (ARRAY['Libertatii','Eminescu','Revolutiei','Stefan cel Mare','Unirii','Bucuresti','Mihai Viteazul','George Cosbuc','Pastravului','Vasile Alecsandri']::text[])[trunc(random() * 10 + 1)::int] || 
        ' Nr. ' || (trunc(random()*100 + 1)::int) || ', ' ||
        (ARRAY['Bucuresti','Cluj-Napoca','Timisoara','Iasi','Brasov','Constanta','Craiova','Sibiu','Oradea','Ploiesti']::text[])[trunc(random() * 10 + 1)::int] AS adresa_domiciliu,
        lpad((trunc(random()*900000 + 100000)::int)::text, 6, '0') AS cod_postal,
        (ARRAY['BTRL','RNCB','INGB','BRDE','CARP','EXIM','OTPV','BREL','PIRB','UGBI']::text[])[trunc(random()*10+1)::int] AS bank_code,
        '07' || lpad((trunc(random()*100000000)::int)::text,8,'0') AS telefon,
        LOWER(
            (ARRAY['Ion','Maria','Andrei','Elena','Mihai','Ioana','Alex','Ana','Gabriel','Cristina']::text[])[trunc(random() * 10 + 1)::int] || '.' ||
            (ARRAY['Popescu','Ionescu','Dumitrescu','Georgescu','Radu','Stan','Marin','Preda','Vasilescu','Stoica']::text[])[trunc(random() * 10 + 1)::int] || '@example.com'
        ) AS email,
        (ARRAY['Activ','Activ','Activ','Activ','Activ','Activ','Activ','Inactiv','Suspendat']::text[])[trunc(random() * 9 + 1)::int] AS stare,
        '0x' || substr(md5(random()::text || random()::text), 1, 40) AS wallet
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
    generate_cnp(sex, data_nasterii, county) AS cnp,  -- Now references CTE columns
    nume,
    prenume,
    prenume_tata,
    data_nasterii,
    sex,
    adresa_domiciliu,
    cod_postal,
    generate_iban(bank_code) AS iban,  -- References CTE column
    telefon,
    email,
    stare,
    wallet
FROM random_data;