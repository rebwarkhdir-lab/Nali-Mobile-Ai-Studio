-- Administrator & User Management Migration

-- 1. Create Roles and Permissions Tables
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    UNIQUE(module, action)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    device_info TEXT,
    browser_info TEXT,
    ip_address TEXT,
    status TEXT DEFAULT 'active' NOT NULL, -- 'active', 'expired', 'revoked'
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enhance Profiles Table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id),
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Seed Default Roles
INSERT INTO roles (name, description, is_system) VALUES 
('Administrator', 'Full access to the entire system', true),
('User', 'Normal operational access', true)
ON CONFLICT (name) DO NOTHING;

-- 4. Seed Default Permissions
INSERT INTO permissions (module, action, description) VALUES
('Dashboard', 'view', 'View Dashboard'),
('Dashboard', 'analytics', 'View Analytics'),
('Mobiles', 'view', 'View Mobiles'),
('Mobiles', 'add', 'Add Mobile'),
('Mobiles', 'edit', 'Edit Mobile'),
('Mobiles', 'delete', 'Delete Mobile'),
('Mobiles', 'sell', 'Sell Mobile'),
('Mobiles', 'view_cost', 'View Mobile Cost'),
('Mobiles', 'view_profit', 'View Mobile Profit'),
('Accessories', 'view', 'View Products'),
('Accessories', 'add', 'Add Products'),
('Accessories', 'edit', 'Edit Products'),
('Accessories', 'delete', 'Delete Products'),
('Accessories', 'stock', 'Adjust Stock'),
('Accessories', 'view_cost', 'View Cost'),
('Accessories', 'view_profit', 'View Profit'),
('Sales', 'view', 'View Sales'),
('Sales', 'create', 'Create Sale'),
('Sales', 'edit', 'Edit Sale'),
('Sales', 'cancel', 'Cancel Sale'),
('Sales', 'return', 'Return Sale'),
('Sales', 'print', 'Print Invoice'),
('Sales', 'view_profit', 'View Sale Profit'),
('Invoices', 'view', 'View Invoices'),
('Invoices', 'create', 'Create Invoice'),
('Invoices', 'edit', 'Edit Invoice'),
('Invoices', 'delete', 'Delete Invoice'),
('Invoices', 'print', 'Print Invoice'),
('Customers', 'view', 'View Customers'),
('Customers', 'add', 'Add Customers'),
('Customers', 'edit', 'Edit Customers'),
('Customers', 'delete', 'Delete Customers'),
('Debts', 'view', 'View Debts'),
('Debts', 'add', 'Add Debt'),
('Debts', 'payment', 'Record Payment'),
('Debts', 'edit_payment', 'Edit Payment'),
('Debts', 'delete_payment', 'Delete Payment'),
('Debts', 'reports', 'View Debt Reports'),
('Reports', 'view', 'View Reports'),
('Reports', 'export', 'Export Reports'),
('Reports', 'financial', 'View Financial Reports'),
('Reports', 'profit', 'View Profit Reports'),
('Administration', 'view_users', 'View Users'),
('Administration', 'create_users', 'Create Users'),
('Administration', 'edit_users', 'Edit Users'),
('Administration', 'delete_users', 'Delete Users'),
('Administration', 'manage_roles', 'Manage Roles'),
('Administration', 'manage_permissions', 'Manage Permissions'),
('Administration', 'view_audit', 'View Audit Logs'),
('Administration', 'manage_sessions', 'Manage Sessions'),
('Administration', 'manage_settings', 'Manage System Settings')
ON CONFLICT (module, action) DO NOTHING;

-- Assign all permissions to Administrator role
DO $$
DECLARE
    admin_role_id UUID;
BEGIN
    SELECT id INTO admin_role_id FROM roles WHERE name = 'Administrator';
    IF admin_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT admin_role_id, id FROM permissions
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Assign basic permissions to User role
DO $$
DECLARE
    user_role_id UUID;
BEGIN
    SELECT id INTO user_role_id FROM roles WHERE name = 'User';
    IF user_role_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT user_role_id, id FROM permissions
        WHERE module IN ('Dashboard', 'Mobiles', 'Accessories', 'Sales', 'Invoices', 'Customers', 'Debts')
        AND action NOT IN ('delete', 'view_cost', 'view_profit', 'financial', 'profit', 'cancel')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON roles FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON permissions FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON role_permissions FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON user_sessions FOR ALL TO authenticated USING (true);

-- Also update existing users to have Administrator role if their old role was 'admin'
DO $$
DECLARE
    admin_role_id UUID;
BEGIN
    SELECT id INTO admin_role_id FROM roles WHERE name = 'Administrator';
    IF admin_role_id IS NOT NULL THEN
        UPDATE profiles SET role_id = admin_role_id WHERE role = 'admin' AND role_id IS NULL;
    END IF;
END $$;

-- Update remaining users to User role
DO $$
DECLARE
    user_role_id UUID;
BEGIN
    SELECT id INTO user_role_id FROM roles WHERE name = 'User';
    IF user_role_id IS NOT NULL THEN
        UPDATE profiles SET role_id = user_role_id WHERE role_id IS NULL;
    END IF;
END $$;

