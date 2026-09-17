-- ============================================================================
-- NALI POS - Enterprise Notification & Alert System Migration
-- Migration: 20260831_notification_system.sql
-- Description: Core schema, indexes, RLS policies, and automated triggers
--              for Inventory, Debts, Repairs, and Administrative Alerts.
-- ============================================================================

-- Enable UUID extension if not already active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. NOTIFICATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_role VARCHAR(50) NOT NULL DEFAULT 'All', -- 'All', 'Administrator', 'Manager', 'Cashier', 'Technician', 'Inventory'
    category VARCHAR(50) NOT NULL CHECK (category IN ('inventory', 'debt', 'repair', 'security', 'system')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    action_url VARCHAR(255),
    snoozed_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments for documentation
COMMENT ON TABLE public.notifications IS 'Stores enterprise real-time alerts across stock, debt, repair, and security categories.';
COMMENT ON COLUMN public.notifications.recipient_user_id IS 'Target user ID or NULL for broadcast / role-based alerts.';
COMMENT ON COLUMN public.notifications.target_role IS 'RBAC routing filter: determines which staff group sees this alert.';
COMMENT ON COLUMN public.notifications.metadata IS 'Structured JSON payload with entity IDs (product_id, customer_id, ticket_id, etc.).';

-- ----------------------------------------------------------------------------
-- 2. PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications (recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON public.notifications (target_role, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications (priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (is_read, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_metadata_gin ON public.notifications USING GIN (metadata);

-- ----------------------------------------------------------------------------
-- 3. NOTIFICATION PREFERENCES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sound_volume INTEGER NOT NULL DEFAULT 80 CHECK (sound_volume BETWEEN 0 AND 100),
    toast_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    toast_auto_dismiss_seconds INTEGER NOT NULL DEFAULT 5 CHECK (toast_auto_dismiss_seconds BETWEEN 2 AND 30),
    category_inventory BOOLEAN NOT NULL DEFAULT TRUE,
    category_debt BOOLEAN NOT NULL DEFAULT TRUE,
    category_repair BOOLEAN NOT NULL DEFAULT TRUE,
    category_security BOOLEAN NOT NULL DEFAULT TRUE,
    category_system BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view own or role-targeted notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notification read state" ON public.notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.notification_preferences;

-- Users can read notifications if directly assigned to them, targeted to their role, or broadcast to 'All'
CREATE POLICY "Users can view own or role-targeted notifications"
    ON public.notifications
    FOR SELECT
    USING (
        auth.uid() = recipient_user_id
        OR recipient_user_id IS NULL
        OR EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.roles r ON up.role_id = r.id
            WHERE up.id = auth.uid()
            AND (
                target_role = 'All'
                OR target_role = r.name
                OR r.name IN ('Administrator', 'Super Admin')
            )
        )
    );

-- Users can mark notifications as read
CREATE POLICY "Users can update own notification read state"
    ON public.notifications
    FOR UPDATE
    USING (
        auth.uid() = recipient_user_id
        OR recipient_user_id IS NULL
        OR EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.roles r ON up.role_id = r.id
            WHERE up.id = auth.uid()
            AND (r.name IN ('Administrator', 'Manager', 'Cashier', 'Technician', 'Inventory'))
        )
    )
    WITH CHECK (
        is_read = TRUE OR read_at IS NOT NULL OR snoozed_until IS NOT NULL
    );

-- Notification preferences policy
CREATE POLICY "Users can manage own preferences"
    ON public.notification_preferences
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. AUTOMATED TRIGGER: INVENTORY & LOW STOCK ALERTS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_trigger_inventory_stock_alert()
RETURNS TRIGGER AS $$
DECLARE
    v_item_name VARCHAR(255);
    v_min_level INTEGER;
    v_current_stock INTEGER;
    v_category VARCHAR(50);
    v_sku VARCHAR(100);
BEGIN
    -- Determine item fields based on source table
    v_item_name := COALESCE(NEW.name, NEW.model, 'Inventory Item');
    v_min_level := COALESCE(NEW.min_reorder_level, 3);
    v_current_stock := COALESCE(NEW.quantity, NEW.stock_quantity, 0);
    v_sku := COALESCE(NEW.sku, NEW.barcode, 'N/A');

    -- Trigger Critical Alert on Complete Out of Stock (0 quantity)
    IF v_current_stock = 0 AND (OLD.quantity > 0 OR OLD.stock_quantity > 0) THEN
        INSERT INTO public.notifications (
            target_role,
            category,
            priority,
            title,
            message,
            metadata,
            action_url,
            created_at
        ) VALUES (
            'Inventory',
            'inventory',
            'critical',
            'CRITICAL: Out of Stock Alert',
            format('"%s" (SKU: %s) has reached 0 quantity during live sales. Immediate reordering required.', v_item_name, v_sku),
            jsonb_build_object(
                'productId', NEW.id,
                'productName', v_item_name,
                'sku', v_sku,
                'currentStock', 0,
                'minReorderLevel', v_min_level,
                'reorderQuantity', 10
            ),
            '/accessories',
            NOW()
        );
    -- Trigger Warning Alert on Low Stock Threshold
    ELSIF v_current_stock <= v_min_level AND v_current_stock > 0 AND (OLD.quantity > v_min_level OR OLD.stock_quantity > v_min_level) THEN
        INSERT INTO public.notifications (
            target_role,
            category,
            priority,
            title,
            message,
            metadata,
            action_url,
            created_at
        ) VALUES (
            'Inventory',
            'inventory',
            'high',
            'Low Stock Warning',
            format('"%s" stock has dropped to %s units (Threshold: %s units).', v_item_name, v_current_stock, v_min_level),
            jsonb_build_object(
                'productId', NEW.id,
                'productName', v_item_name,
                'sku', v_sku,
                'currentStock', v_current_stock,
                'minReorderLevel', v_min_level,
                'reorderQuantity', (v_min_level * 3)
            ),
            '/accessories',
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to accessories or products table if exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accessories') THEN
        DROP TRIGGER IF EXISTS trg_accessory_stock_check ON public.accessories;
        CREATE TRIGGER trg_accessory_stock_check
            AFTER UPDATE OF quantity ON public.accessories
            FOR EACH ROW
            EXECUTE FUNCTION public.fn_trigger_inventory_stock_alert();
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        DROP TRIGGER IF EXISTS trg_product_stock_check ON public.products;
        CREATE TRIGGER trg_product_stock_check
            AFTER UPDATE OF stock_quantity ON public.products
            FOR EACH ROW
            EXECUTE FUNCTION public.fn_trigger_inventory_stock_alert();
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. AUTOMATED STORED PROCEDURE: DEBTS & INSTALLMENTS OVERDUE CHECK
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_check_and_notify_debts()
RETURNS INTEGER AS $$
DECLARE
    v_debt RECORD;
    v_count INTEGER := 0;
    v_days_diff INTEGER;
    v_priority VARCHAR(20);
    v_title VARCHAR(255);
    v_message TEXT;
BEGIN
    -- Check all unpaid debts with due dates within 3 days or already overdue
    FOR v_debt IN
        SELECT 
            d.id AS debt_id,
            d.customer_name,
            d.customer_phone,
            d.remaining_amount,
            d.currency,
            d.due_date,
            (CURRENT_DATE - d.due_date::DATE) AS days_overdue
        FROM public.debts d
        WHERE d.status NOT IN ('paid', 'cancelled')
        AND d.remaining_amount > 0
        AND d.due_date::DATE <= (CURRENT_DATE + INTERVAL '3 days')
        AND (d.snoozed_until IS NULL OR d.snoozed_until < NOW())
    LOOP
        -- Determine priority & message phrasing
        IF v_debt.days_overdue > 0 THEN
            v_priority := 'critical';
            v_title := format('Overdue Debt: %s', v_debt.customer_name);
            v_message := format('Customer %s has an overdue balance of %s %s (Overdue by %s days). Due date was %s.',
                v_debt.customer_name, v_debt.remaining_amount, v_debt.currency, v_debt.days_overdue, v_debt.due_date);
        ELSIF v_debt.days_overdue = 0 THEN
            v_priority := 'high';
            v_title := format('Debt Due Today: %s', v_debt.customer_name);
            v_message := format('Customer %s has a balance of %s %s scheduled for payment today.',
                v_debt.customer_name, v_debt.remaining_amount, v_debt.currency);
        ELSE
            v_priority := 'medium';
            v_title := format('Upcoming Installment: %s', v_debt.customer_name);
            v_message := format('Customer %s has an upcoming installment of %s %s due in %s days (%s).',
                v_debt.customer_name, v_debt.remaining_amount, v_debt.currency, ABS(v_debt.days_overdue), v_debt.due_date);
        END IF;

        -- Check if an unread notification already exists today to prevent duplicate spam
        IF NOT EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE metadata->>'debtId' = v_debt.debt_id::TEXT
            AND is_read = FALSE
            AND created_at >= (NOW() - INTERVAL '24 hours')
        ) THEN
            INSERT INTO public.notifications (
                target_role,
                category,
                priority,
                title,
                message,
                metadata,
                action_url,
                created_at
            ) VALUES (
                'Cashier',
                'debt',
                v_priority,
                v_title,
                v_message,
                jsonb_build_object(
                    'debtId', v_debt.debt_id,
                    'customerName', v_debt.customer_name,
                    'customerPhone', v_debt.customer_phone,
                    'amountDue', v_debt.remaining_amount,
                    'currency', v_debt.currency,
                    'dueDate', v_debt.due_date,
                    'daysOverdue', v_debt.days_overdue
                ),
                '/debts',
                NOW()
            );
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 7. REPAIR TICKET READY / PART REQUESTED TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_trigger_repair_ticket_alert()
RETURNS TRIGGER AS $$
BEGIN
    -- Ready for Customer Pickup Alert
    IF NEW.status = 'ready' AND (OLD.status IS NULL OR OLD.status != 'ready') THEN
        INSERT INTO public.notifications (
            target_role,
            category,
            priority,
            title,
            message,
            metadata,
            action_url,
            created_at
        ) VALUES (
            'Cashier',
            'repair',
            'medium',
            format('Repair Ready: %s', COALESCE(NEW.device_model, 'Phone Device')),
            format('Ticket #%s (%s) for %s is completed and ready for pickup. Total fee: %s %s.',
                COALESCE(NEW.ticket_number, NEW.id::text),
                COALESCE(NEW.device_model, 'Device'),
                COALESCE(NEW.customer_name, 'Customer'),
                COALESCE(NEW.final_cost, NEW.estimated_cost, 0),
                COALESCE(NEW.currency, 'USD')
            ),
            jsonb_build_object(
                'ticketId', NEW.id,
                'ticketNumber', NEW.ticket_number,
                'customerName', NEW.customer_name,
                'customerPhone', NEW.customer_phone,
                'deviceModel', NEW.device_model,
                'repairStatus', 'ready'
            ),
            '/pos',
            NOW()
        );
    -- Technician Spare Part Request Alert
    ELSIF NEW.status = 'part_requested' AND (OLD.status IS NULL OR OLD.status != 'part_requested') THEN
        INSERT INTO public.notifications (
            target_role,
            category,
            priority,
            title,
            message,
            metadata,
            action_url,
            created_at
        ) VALUES (
            'Inventory',
            'repair',
            'high',
            format('Spare Part Requested: %s', COALESCE(NEW.part_name, 'Replacement Part')),
            format('Technician %s requested part "%s" for repair ticket #%s (%s).',
                COALESCE(NEW.technician_name, 'Technician'),
                COALESCE(NEW.part_name, 'Part'),
                COALESCE(NEW.ticket_number, NEW.id::text),
                COALESCE(NEW.device_model, 'Device')
            ),
            jsonb_build_object(
                'ticketId', NEW.id,
                'ticketNumber', NEW.ticket_number,
                'partRequired', NEW.part_name,
                'deviceModel', NEW.device_model,
                'technicianName', NEW.technician_name
            ),
            '/accessories',
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 8. SAMPLE SEED DATA FOR DEMO & TESTING
-- ----------------------------------------------------------------------------
INSERT INTO public.notifications (
    target_role, category, priority, title, message, metadata, is_read, action_url, created_at
) VALUES 
(
    'Inventory',
    'inventory',
    'critical',
    'CRITICAL: Out of Stock Alert',
    'iPhone 15 Pro Max Ceramic Glass (SKU: SP-IP15PM) is completely out of stock. 0 units left.',
    '{"productId": "prod-glass-15pm", "productName": "iPhone 15 Pro Max Ceramic Glass", "sku": "SP-IP15PM", "currentStock": 0, "minReorderLevel": 5, "reorderQuantity": 25, "itemCategory": "screen_protector"}'::jsonb,
    FALSE,
    '/screen-protectors',
    NOW() - INTERVAL '15 minutes'
),
(
    'Cashier',
    'debt',
    'critical',
    'Overdue Debt: Rebar Ahmed',
    'Customer Rebar Ahmed has an overdue debt balance of $450 USD. Payment was due 5 days ago.',
    '{"customerId": "cust-01", "customerName": "Rebar Ahmed", "customerPhone": "+9647501234567", "amountDue": 450, "currency": "USD", "dueDate": "2026-08-26", "daysOverdue": 5, "debtId": "debt-rebar-01"}'::jsonb,
    FALSE,
    '/debts',
    NOW() - INTERVAL '1 hour'
),
(
    'Cashier',
    'repair',
    'medium',
    'Repair Ready for Pickup: Galaxy S24 Ultra',
    'Ticket #REP-3082 for Galaxy S24 Ultra (Display + Battery Replacement) is completed by Technician Dastan.',
    '{"ticketId": "rep-3082", "ticketNumber": "REP-3082", "customerName": "Soran Mohammed", "customerPhone": "+9647709876543", "deviceModel": "Galaxy S24 Ultra", "repairStatus": "ready", "finalCost": 125, "currency": "USD"}'::jsonb,
    FALSE,
    '/pos',
    NOW() - INTERVAL '3 hours'
),
(
    'Administrator',
    'security',
    'high',
    'Cash Drawer Discrepancy Alert',
    'Evening register close for Terminal #1 showed an unexpected discrepancy of -$35 USD ($50,000 IQD).',
    '{"registerId": "POS-TERM-01", "cashierName": "Ahmed K.", "expectedAmount": 1450, "actualAmount": 1415, "discrepancyAmount": -35, "currency": "USD", "eventType": "register_close"}'::jsonb,
    FALSE,
    '/reports',
    NOW() - INTERVAL '5 hours'
),
(
    'Inventory',
    'inventory',
    'high',
    'Low Stock Warning: 20W USB-C Adapter',
    'Apple 20W USB-C Power Adapter stock is down to 2 units (Threshold: 5 units).',
    '{"productId": "prod-apple-20w", "productName": "Apple 20W USB-C Power Adapter", "sku": "ACC-AP-20W", "currentStock": 2, "minReorderLevel": 5, "reorderQuantity": 15, "itemCategory": "accessory"}'::jsonb,
    FALSE,
    '/accessories',
    NOW() - INTERVAL '1 day'
);
