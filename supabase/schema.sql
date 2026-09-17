-- Supabase Schema for Nali Mobile Shop Management System

-- Set up custom enum types
CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE mobile_status AS ENUM ('in_stock', 'reserved', 'sold', 'returned', 'defective', 'archived');
CREATE TYPE currency_type AS ENUM ('USD', 'IQD');
-- CREATE TYPE payment_method AS ENUM ('cash', 'debt', 'installment');

-- PROFILES (Users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'employee'::user_role NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUPPLIERS
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    secondary_phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BRANDS
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MOBILES (Individually Tracked)
CREATE TABLE mobiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id),
    model TEXT NOT NULL,
    imei_1 TEXT UNIQUE,
    imei_2 TEXT UNIQUE,
    serial_number TEXT,
    storage TEXT,
    ram TEXT,
    color TEXT,
    battery TEXT,
    battery_health INTEGER,
    buy_price DECIMAL(12, 2) NOT NULL,
    sell_price DECIMAL(12, 2) NOT NULL,
    currency currency_type DEFAULT 'USD'::currency_type NOT NULL,
    condition TEXT DEFAULT 'new' NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    purchase_date DATE,
    warranty TEXT,
    accessories TEXT,
    notes TEXT,
    status mobile_status DEFAULT 'in_stock'::mobile_status NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACCESSORY CATEGORIES
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL, -- 'accessory', 'expense', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACCESSORIES (Quantity Based)
CREATE TABLE accessories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    barcode TEXT UNIQUE,
    supplier_id UUID REFERENCES suppliers(id),
    category_id UUID REFERENCES categories(id),
    brand_id UUID REFERENCES brands(id),
    compatible_model TEXT,
    buy_price DECIMAL(12, 2) NOT NULL,
    sell_price DECIMAL(12, 2) NOT NULL,
    currency currency_type DEFAULT 'USD'::currency_type NOT NULL,
    quantity INTEGER DEFAULT 0 NOT NULL,
    min_stock INTEGER DEFAULT 5 NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVENTORY TRANSACTIONS
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_type TEXT NOT NULL, -- 'mobile', 'accessory'
    mobile_id UUID REFERENCES mobiles(id),
    accessory_id UUID REFERENCES accessories(id),
    transaction_type TEXT NOT NULL, -- 'purchase', 'sale', 'return', 'adjustment'
    quantity INTEGER NOT NULL,
    previous_quantity INTEGER,
    new_quantity INTEGER,
    reference_id UUID, -- invoice_id or purchase_id
    user_id UUID REFERENCES profiles(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOMERS
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    secondary_phone TEXT,
    address TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVOICES (Sales)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id),
    subtotal DECIMAL(12, 2) NOT NULL,
    discount DECIMAL(12, 2) DEFAULT 0 NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    paid DECIMAL(12, 2) NOT NULL,
    remaining DECIMAL(12, 2) NOT NULL,
    currency currency_type DEFAULT 'USD'::currency_type NOT NULL,
    payment_method TEXT NOT NULL, -- 'cash', 'debt', 'installment'
    status TEXT DEFAULT 'completed' NOT NULL,
    user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVOICE ITEMS
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    product_type TEXT NOT NULL, -- 'mobile', 'accessory'
    mobile_id UUID REFERENCES mobiles(id),
    accessory_id UUID REFERENCES accessories(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    acquisition_cost DECIMAL(12, 2) NOT NULL, -- Important for profit calculation
    currency currency_type DEFAULT 'USD'::currency_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEBTS
CREATE TABLE debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    invoice_id UUID REFERENCES invoices(id),
    original_amount DECIMAL(12, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) DEFAULT 0 NOT NULL,
    remaining_amount DECIMAL(12, 2) NOT NULL,
    currency currency_type DEFAULT 'USD'::currency_type NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'outstanding' NOT NULL, -- 'outstanding', 'partially_paid', 'paid', 'overdue'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENTS (Customer Payments against Debt/Invoices)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id),
    debt_id UUID REFERENCES debts(id),
    invoice_id UUID REFERENCES invoices(id),
    amount DECIMAL(12, 2) NOT NULL,
    currency currency_type DEFAULT 'USD'::currency_type NOT NULL,
    payment_method TEXT NOT NULL,
    notes TEXT,
    user_id UUID REFERENCES profiles(id),
    status TEXT DEFAULT 'completed' NOT NULL, -- 'completed', 'reversed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INSTALLMENTS
CREATE TABLE installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    invoice_id UUID REFERENCES invoices(id),
    total_amount DECIMAL(12, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) DEFAULT 0 NOT NULL,
    remaining_amount DECIMAL(12, 2) NOT NULL,
    currency currency_type DEFAULT 'USD'::currency_type NOT NULL,
    frequency TEXT NOT NULL, -- 'weekly', 'biweekly', 'monthly'
    status TEXT DEFAULT 'active' NOT NULL, -- 'active', 'completed', 'cancelled'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INSTALLMENT SCHEDULE (Individual payments due)
CREATE TABLE installment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_id UUID REFERENCES installments(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    amount_due DECIMAL(12, 2) NOT NULL,
    amount_paid DECIMAL(12, 2) DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'upcoming' NOT NULL, -- 'upcoming', 'due', 'partially_paid', 'paid', 'overdue'
    payment_id UUID REFERENCES payments(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PURCHASES
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_number TEXT NOT NULL UNIQUE,
    supplier_id UUID REFERENCES suppliers(id),
    total_amount DECIMAL(12, 2) NOT NULL,
    currency currency_type DEFAULT 'USD'::currency_type NOT NULL,
    status TEXT DEFAULT 'completed' NOT NULL,
    user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PURCHASE ITEMS
CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    product_type TEXT NOT NULL,
    mobile_id UUID REFERENCES mobiles(id),
    accessory_id UUID REFERENCES accessories(id),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    currency currency_type DEFAULT 'USD'::currency_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXPENSES
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category_id UUID REFERENCES categories(id),
    amount DECIMAL(12, 2) NOT NULL,
    currency currency_type DEFAULT 'USD'::currency_type NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT,
    reference TEXT,
    user_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SETTINGS
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (For now, allow authenticated users to read/write, you can lock down 'admin' only actions later)
CREATE POLICY "Enable read access for all authenticated users" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON suppliers FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON brands FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON mobiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON accessories FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON inventory_transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON customers FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON invoices FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON invoice_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON debts FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON payments FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON installments FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON installment_schedules FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON purchases FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON purchase_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON expenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON audit_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON settings FOR ALL TO authenticated USING (true);
