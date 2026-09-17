-- ==============================================================================
-- NALI POS - INDEPENDENT TABLES FOR CROSS-DEVICE ACCOUNTS & STORE SETTINGS SYNC
-- ==============================================================================
-- Run this script directly in your Supabase Project:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run.
-- ==============================================================================

-- 1. INDEPENDENT STAFF & ADMINISTRATOR ACCOUNTS TABLE
-- Does not depend on auth.users foreign keys so accounts can be added, edited,
-- and omitted (deleted) seamlessly across iPads, iPhones, and PC workstations.
CREATE TABLE IF NOT EXISTS public.staff_accounts (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    username TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    password_hash TEXT,
    pin TEXT,
    must_change_password BOOLEAN DEFAULT FALSE,
    role_id TEXT NOT NULL DEFAULT 'role-cashier',
    role_data JSONB DEFAULT '{}'::jsonb,
    branch_id TEXT DEFAULT 'branch-1',
    branch_data JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_attempts INTEGER DEFAULT 0,
    last_login_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for instant username and email lookup
CREATE INDEX IF NOT EXISTS idx_staff_accounts_username ON public.staff_accounts(username);
CREATE INDEX IF NOT EXISTS idx_staff_accounts_status ON public.staff_accounts(status);
CREATE INDEX IF NOT EXISTS idx_staff_accounts_deleted_at ON public.staff_accounts(deleted_at);

-- 2. INDEPENDENT STORE BRANDING & PROJECT SETTINGS TABLE
-- Automatically synchronizes store name, status subtitle, and uploaded logo across all devices.
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_name TEXT DEFAULT 'NALI POS',
    store_subtitle TEXT DEFAULT 'Terminal Active',
    custom_logo_url TEXT,
    logo_fit TEXT DEFAULT 'cover',
    logo_shape TEXT DEFAULT 'rounded',
    logo_bg_color TEXT DEFAULT 'white',
    theme TEXT DEFAULT 'emerald',
    appearance TEXT DEFAULT 'dark',
    exchange_rate NUMERIC DEFAULT 1500,
    settings_json JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default store settings if none exists yet
INSERT INTO public.store_settings (id, store_name, store_subtitle, logo_fit, logo_shape, logo_bg_color, theme, appearance)
VALUES ('default', 'NALI POS', 'Terminal Active', 'cover', 'rounded', 'white', 'emerald', 'dark')
ON CONFLICT (id) DO NOTHING;

-- 3. INSERT DEFAULT INITIAL ADMINISTRATOR ACCOUNT IF NOT EXISTS
INSERT INTO public.staff_accounts (
    id, full_name, username, email, phone, password_hash, pin, 
    role_id, role_data, branch_id, branch_data, status, is_active
) VALUES (
    'usr-001',
    'Nali Admin',
    'nali.admin',
    'admin@nalipos.com',
    '+964 750 111 2233',
    'admin123',
    '1234',
    'role-admin',
    '{"id": "role-admin", "name": "Administrator", "is_system": true, "color": "#6366F1"}'::jsonb,
    'branch-1',
    '{"id": "branch-1", "name": "Main Store"}'::jsonb,
    'active',
    true
) ON CONFLICT (id) DO NOTHING;

-- 4. ENABLE ROW LEVEL SECURITY (RLS) WITH UNRESTRICTED ACCESS FOR POS CLIENTS
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Drop prior policies if re-running
DROP POLICY IF EXISTS "Enable all access for staff_accounts" ON public.staff_accounts;
DROP POLICY IF EXISTS "Enable all access for store_settings" ON public.store_settings;

-- Create open policies for authenticated and anon clients (POS Terminals & Mobile PWAs)
CREATE POLICY "Enable all access for staff_accounts" 
ON public.staff_accounts 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Enable all access for store_settings" 
ON public.store_settings 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 5. ENABLE SUPABASE REALTIME REPLICATION FOR LIVE CROSS-DEVICE UPDATES
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_accounts;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Non-blocking if table is already in publication
  NULL;
END $$;
