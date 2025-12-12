-- Add owner_wallet_address column to all entity tables

-- Persoane Fizice
ALTER TABLE persoane_fizice 
ADD COLUMN owner_wallet_address VARCHAR(62);

CREATE INDEX IF NOT EXISTS idx_persoane_fizice_owner_wallet 
ON persoane_fizice(owner_wallet_address) 
WHERE owner_wallet_address IS NOT NULL;

-- Persoane Juridice (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'persoane_juridice') THEN
        ALTER TABLE persoane_juridice 
        ADD COLUMN IF NOT EXISTS owner_wallet_address VARCHAR(62);
        
        CREATE INDEX IF NOT EXISTS idx_persoane_juridice_owner_wallet 
        ON persoane_juridice(owner_wallet_address) 
        WHERE owner_wallet_address IS NOT NULL;
    END IF;
END $$;

-- ONG (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ong') THEN
        ALTER TABLE ong 
        ADD COLUMN IF NOT EXISTS owner_wallet_address VARCHAR(62);
        
        CREATE INDEX IF NOT EXISTS idx_ong_owner_wallet 
        ON ong(owner_wallet_address) 
        WHERE owner_wallet_address IS NOT NULL;
    END IF;
END $$;

-- Institutii Publice (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'institutii_publice') THEN
        ALTER TABLE institutii_publice 
        ADD COLUMN IF NOT EXISTS owner_wallet_address VARCHAR(62);
        
        CREATE INDEX IF NOT EXISTS idx_institutii_publice_owner_wallet 
        ON institutii_publice(owner_wallet_address) 
        WHERE owner_wallet_address IS NOT NULL;
    END IF;
END $$;

-- Entitati Straine (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'entitati_straine') THEN
        ALTER TABLE entitati_straine 
        ADD COLUMN IF NOT EXISTS owner_wallet_address VARCHAR(62);
        
        CREATE INDEX IF NOT EXISTS idx_entitati_straine_owner_wallet 
        ON entitati_straine(owner_wallet_address) 
        WHERE owner_wallet_address IS NOT NULL;
    END IF;
END $$;
