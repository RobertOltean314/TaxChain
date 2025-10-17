-- Database initialization script for TaxChain
-- This script runs automatically when PostgreSQL container starts for the first time

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- INVOICES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic invoice information
    numar_serie VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    
    -- Entity CUIs (Romanian tax IDs)
    furnizor_cui VARCHAR(50) NOT NULL,
    cumparator_cui VARCHAR(50) NOT NULL,
    
    -- Financial information
    baza_impozabila DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_tva DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_de_plata DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_positive_amounts CHECK (
        baza_impozabila >= 0 AND 
        total_tva >= 0 AND 
        total_de_plata >= 0
    )
);

-- Index for faster queries
CREATE INDEX idx_invoices_numar_serie ON invoices(numar_serie);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_furnizor ON invoices(furnizor_cui);
CREATE INDEX idx_invoices_cumparator ON invoices(cumparator_cui);

-- ==========================================
-- LINE ITEMS TABLE (Invoice Items)
-- ==========================================
CREATE TABLE IF NOT EXISTS line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Item details
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    tax_rate DECIMAL(5, 4),
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_line_item_amounts CHECK (
        quantity > 0 AND
        unit_price >= 0 AND
        total_price >= 0 AND
        (tax_rate IS NULL OR tax_rate >= 0)
    )
);

-- Index for faster joins
CREATE INDEX idx_line_items_invoice_id ON line_items(invoice_id);

-- ==========================================
-- BUSINESS ENTITIES TABLE (for future use)
-- ==========================================
CREATE TABLE IF NOT EXISTS business_entities (
    id VARCHAR(255) PRIMARY KEY,
    
    -- Entity information
    name VARCHAR(500) NOT NULL,
    registration_number VARCHAR(100) NOT NULL UNIQUE,
    tax_id VARCHAR(100) NOT NULL,
    country_code VARCHAR(10) NOT NULL,
    address TEXT,
    entity_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_entities_registration_number ON business_entities(registration_number);
CREATE INDEX idx_entities_tax_id ON business_entities(tax_id);
CREATE INDEX idx_entities_country_code ON business_entities(country_code);

-- ==========================================
-- ZK PROOFS TABLE (for future use)
-- ==========================================
CREATE TABLE IF NOT EXISTS zk_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    calculation_id VARCHAR(255) NOT NULL UNIQUE,
    
    -- Proof data
    proof_hash VARCHAR(500),
    verification_key VARCHAR(500),
    
    -- Financial data (encrypted or hashed)
    income DECIMAL(15, 2) NOT NULL,
    expenses DECIMAL(15, 2) NOT NULL,
    tax_owed DECIMAL(15, 2) NOT NULL,
    
    -- Metadata
    generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMP
);

-- Index
CREATE INDEX idx_zk_proofs_calculation_id ON zk_proofs(calculation_id);

-- ==========================================
-- TRIGGER: Update updated_at timestamp
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_entities_updated_at BEFORE UPDATE ON business_entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- SEED DATA (for testing)
-- ==========================================

-- Insert test business entity
INSERT INTO business_entities (id, name, registration_number, tax_id, country_code, address, entity_type, is_active)
VALUES 
    ('test-entity-1', 'Test Company SRL', 'J40/1234/2024', 'RO12345678', 'RO', 'Bucharest, Romania', 'SRL', true),
    ('test-entity-2', 'Client Company SRL', 'J40/5678/2024', 'RO87654321', 'RO', 'Cluj-Napoca, Romania', 'SRL', true)
ON CONFLICT (id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully!';
    RAISE NOTICE 'Tables created: invoices, line_items, business_entities, zk_proofs';
    RAISE NOTICE 'Test data inserted: 2 business entities';
END $$;
