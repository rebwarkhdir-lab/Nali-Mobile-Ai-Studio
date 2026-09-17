-- ==============================================================================
-- NALI MOBILE POS & INVENTORY MANAGEMENT SYSTEM
-- MASTER CONSOLIDATED DATABASE SCHEMA & PRODUCTION MIGRATION SCRIPT
-- Version: 2.0.0 (Production Ready)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ROLES & ACCESS CONTROL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#6366F1',
    is_system BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    label TEXT,
    description TEXT,
    category TEXT,
    is_sensitive BOOLEAN DEFAULT false,
    UNIQUE(module, action)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TEXT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id TEXT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ------------------------------------------------------------------------------
-- 2. USER PROFILES & SESSIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    role_id TEXT REFERENCES roles(id) ON DELETE SET NULL,
    branch_id TEXT,
    status TEXT DEFAULT 'active' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
    last_login_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    notes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    user_name TEXT,
    user_role TEXT,
    device_name TEXT,
    device_type TEXT,
    browser TEXT,
    ip_address TEXT,
    location TEXT,
    status TEXT DEFAULT 'active' NOT NULL,
    is_current BOOLEAN DEFAULT false,
    trusted BOOLEAN DEFAULT true,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. CORE INVENTORY METADATA (BRANDS, CATEGORIES, SUPPLIERS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    secondary_phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. INVENTORY ITEMS (MOBILES & ACCESSORIES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nali_mobiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imei TEXT UNIQUE,
    imei2 TEXT,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    color TEXT,
    storage TEXT,
    ram TEXT,
    condition TEXT NOT NULL DEFAULT 'new' CHECK (condition IN ('new', 'used')),
    batteryHealth INTEGER,
    accessoriesIncluded TEXT[],
    "boughtFrom" TEXT,
    "purchaseDate" TEXT,
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'IQD')),
    "buyPrice" NUMERIC(12, 2) NOT NULL DEFAULT 0,
    "sellPrice" NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved')),
    "soldDate" TEXT,
    "soldPrice" NUMERIC(12, 2),
    "soldToCustomer" TEXT,
    "soldNotes" TEXT,
    notes TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nali_accessories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    barcode TEXT,
    company TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    "notifyThreshold" INTEGER DEFAULT 5,
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'IQD')),
    "buyPrice" NUMERIC(12, 2) NOT NULL DEFAULT 0,
    "sellPrice" NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    image TEXT,
    color TEXT,
    compatibility TEXT,
    warranty TEXT,
    location TEXT,
    sku TEXT,
    status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
    "totalSold" INTEGER DEFAULT 0,
    "purchaseDate" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backward compatibility views
CREATE OR REPLACE VIEW mobiles AS SELECT * FROM nali_mobiles;
CREATE OR REPLACE VIEW accessories AS SELECT * FROM nali_accessories;

-- ------------------------------------------------------------------------------
-- 5. CUSTOMERS & DIRECT POINT OF SALE (POS) SALES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    id_card TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no TEXT NOT NULL UNIQUE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TEXT,
    sell_type TEXT NOT NULL DEFAULT 'cash',
    customer_name TEXT,
    customer_phone TEXT,
    customer_id_card TEXT,
    customer_address TEXT,
    guarantor_name TEXT,
    guarantor_phone TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    checkout_currency TEXT NOT NULL DEFAULT 'USD',
    exchange_rate NUMERIC(12, 2) NOT NULL DEFAULT 1500,
    cash_tendered NUMERIC(12, 2),
    cash_change NUMERIC(12, 2),
    payment_method TEXT NOT NULL DEFAULT 'cash',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. DEBTS & CUSTOMER CREDIT (QARZ)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nali_debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_id_card TEXT,
    customer_address TEXT,
    guarantor_name TEXT,
    guarantor_phone TEXT,
    product_summary TEXT,
    original_amount NUMERIC(12, 2) NOT NULL,
    down_payment NUMERIC(12, 2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'IQD')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'defaulted', 'overdue')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nali_debt_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_id UUID NOT NULL REFERENCES nali_debts(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'IQD')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. INSTALLMENTS & CONTRACT SCHEDULES (EQSAT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nali_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_id_card TEXT,
    customer_address TEXT,
    guarantor_name TEXT,
    guarantor_phone TEXT,
    product_summary TEXT,
    principal_amount NUMERIC(12, 2) NOT NULL,
    additional_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL,
    down_payment NUMERIC(12, 2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    balance_remaining NUMERIC(12, 2) NOT NULL,
    duration_months INTEGER NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly',
    monthly_payment NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'IQD')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    first_due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'defaulted', 'late')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nali_installment_schedules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_id UUID NOT NULL REFERENCES nali_installments(id) ON DELETE CASCADE,
    month_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount_due NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'paid', 'partial', 'overdue')),
    paid_date DATE,
    payment_method TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backward compatibility views
CREATE OR REPLACE VIEW debts AS SELECT * FROM nali_debts;
CREATE OR REPLACE VIEW installments AS SELECT * FROM nali_installments;

-- ------------------------------------------------------------------------------
-- 8. SUPPLIER RETURNS & RMA CLAIMS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rma_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rma_number TEXT NOT NULL UNIQUE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT NOT NULL,
    supplier_phone TEXT,
    item_type TEXT NOT NULL DEFAULT 'mobile',
    item_id UUID,
    item_name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    serial_or_imei TEXT,
    defect_category TEXT NOT NULL,
    defect_description TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    requested_resolution TEXT NOT NULL DEFAULT 'replacement',
    status TEXT NOT NULL DEFAULT 'pending_dispatch',
    priority TEXT NOT NULL DEFAULT 'normal',
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    refund_amount NUMERIC(12, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. NOTIFICATIONS & SECURITY NOTICES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    target_role TEXT NOT NULL DEFAULT 'All',
    category TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    snoozed_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    reference_type TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(notification_id, reference_type, reference_id)
);

-- ------------------------------------------------------------------------------
-- 10. SYSTEM AUDIT LOGS & SETTINGS / CLOUD KV
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    user_name TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    module TEXT,
    entity TEXT,
    entity_id TEXT,
    target TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type TEXT NOT NULL,
    item_id UUID NOT NULL,
    transaction_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost NUMERIC(12, 2),
    total_cost NUMERIC(12, 2),
    reference_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 11. HIGH-PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_mobiles_imei ON nali_mobiles(imei);
CREATE INDEX IF NOT EXISTS idx_mobiles_status ON nali_mobiles(status);
CREATE INDEX IF NOT EXISTS idx_mobiles_brand ON nali_mobiles(brand);

CREATE INDEX IF NOT EXISTS idx_accessories_barcode ON nali_accessories(barcode);
CREATE INDEX IF NOT EXISTS idx_accessories_status ON nali_accessories(status);
CREATE INDEX IF NOT EXISTS idx_accessories_category ON nali_accessories(category);

CREATE INDEX IF NOT EXISTS idx_pos_sales_invoice ON pos_sales(invoice_no);
CREATE INDEX IF NOT EXISTS idx_pos_sales_date ON pos_sales(date DESC);

CREATE INDEX IF NOT EXISTS idx_debts_phone ON nali_debts(customer_phone);
CREATE INDEX IF NOT EXISTS idx_debts_status ON nali_debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_due_date ON nali_debts(due_date);

CREATE INDEX IF NOT EXISTS idx_installments_phone ON nali_installments(customer_phone);
CREATE INDEX IF NOT EXISTS idx_installments_status ON nali_installments(status);
CREATE INDEX IF NOT EXISTS idx_installment_sched_due ON nali_installment_schedules(due_date);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);

-- ------------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY (RLS) & UNCONSTRAINED POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE nali_mobiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nali_accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE nali_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nali_debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nali_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nali_installment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rma_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Standard Policies: Allow full CRUD for Authenticated POS Users
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated full access" ON %I', tbl);
        EXECUTE format('CREATE POLICY "Allow authenticated full access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 13. SEED INITIAL SYSTEM ROLES & PERMISSIONS
-- ------------------------------------------------------------------------------
INSERT INTO roles (id, name, description, color, is_system) VALUES 
('role-admin', 'Administrator', 'Full root access across all system modules', '#6366F1', true),
('role-manager', 'Manager', 'Branch supervisor with inventory and reporting control', '#10B981', true),
('role-cashier', 'Cashier', 'POS checkout, debt collection and basic sales', '#3B82F6', true),
('role-technician', 'Technician', 'Repair intake, diagnosis and warranty RMA', '#F59E0B', true)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- Grant all permissions to Administrator role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-admin', id FROM permissions
ON CONFLICT DO NOTHING;

-- Schema setup completed successfully
SELECT 'Nali Mobile POS & Inventory Database Schema successfully initialized!' AS status;
