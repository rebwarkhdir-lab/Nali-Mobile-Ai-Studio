-- ==============================================================================
-- NALI MOBILE - SQL MIGRATION FOR DEBTS AND INSTALLMENTS
-- ==============================================================================

-- 1. DEBTS TABLE
CREATE TABLE IF NOT EXISTS nali_debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_address TEXT,
    customer_id_card TEXT,
    guarantor_name TEXT,
    guarantor_phone TEXT,
    invoice_id TEXT,
    invoice_number TEXT,
    product_summary TEXT,
    original_amount NUMERIC(12, 2) NOT NULL,
    down_payment NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    paid_amount NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    remaining_amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'outstanding', -- 'outstanding', 'partially_paid', 'paid', 'overdue', 'cancelled'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DEBT PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS nali_debt_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_id UUID REFERENCES nali_debts(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    payment_method TEXT NOT NULL DEFAULT 'cash',
    receipt_number TEXT NOT NULL,
    notes TEXT,
    received_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INSTALLMENTS TABLE
CREATE TABLE IF NOT EXISTS nali_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_id_card TEXT,
    customer_address TEXT,
    guarantor_name TEXT,
    guarantor_phone TEXT,
    guarantor_id_card TEXT,
    guarantor_address TEXT,
    invoice_id TEXT,
    invoice_number TEXT,
    product_summary TEXT,
    principal_amount NUMERIC(12, 2) NOT NULL,
    additional_fee NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    down_payment NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    remaining_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    balance_remaining NUMERIC(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    duration_months INTEGER NOT NULL,
    monthly_payment NUMERIC(12, 2) NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    first_due_date DATE NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly',
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'overdue', 'cancelled'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INSTALLMENT SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS nali_installment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_id UUID REFERENCES nali_installments(id) ON DELETE CASCADE,
    month_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount_due NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming', -- 'upcoming', 'due', 'paid', 'partially_paid', 'overdue'
    paid_date TIMESTAMPTZ,
    payment_method TEXT,
    receipt_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE nali_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nali_debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nali_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nali_installment_schedules ENABLE ROW LEVEL SECURITY;

-- 6. SETUP PERMISSIVE POLICIES FOR STORE OPERATIONS
DROP POLICY IF EXISTS "Enable all access for nali_debts" ON nali_debts;
CREATE POLICY "Enable all access for nali_debts" ON nali_debts FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for nali_debt_payments" ON nali_debt_payments;
CREATE POLICY "Enable all access for nali_debt_payments" ON nali_debt_payments FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for nali_installments" ON nali_installments;
CREATE POLICY "Enable all access for nali_installments" ON nali_installments FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for nali_installment_schedules" ON nali_installment_schedules;
CREATE POLICY "Enable all access for nali_installment_schedules" ON nali_installment_schedules FOR ALL USING (true);

-- 7. REALTIME PUBLICATION SETUP (if supabase_realtime publication is enabled)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE nali_debts;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE nali_debt_payments;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE nali_installments;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE nali_installment_schedules;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
