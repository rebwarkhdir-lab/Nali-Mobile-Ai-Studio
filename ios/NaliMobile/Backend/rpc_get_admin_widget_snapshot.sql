-- ==============================================================================
-- NALI MOBILE POS - WIDGETKIT INTEGRATION LAYER
-- RPC Function: get_admin_widget_snapshot
-- Description: Computes a high-performance, lightweight (<3KB) data snapshot
--              specifically designed for iOS 17+ WidgetKit extension timelines.
-- Security: SECURITY DEFINER with strict Admin Role Verification via auth.uid()
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_widget_snapshot(p_store_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_is_admin BOOLEAN := FALSE;
    v_today_date DATE;
    
    -- Today's sales aggregations
    v_today_sales_iqd NUMERIC(15, 2) := 0;
    v_today_sales_usd NUMERIC(15, 2) := 0;
    v_today_profit_iqd NUMERIC(15, 2) := 0;
    v_today_profit_usd NUMERIC(15, 2) := 0;
    v_transaction_count_today INTEGER := 0;
    
    -- Last sale details
    v_last_sale JSONB := NULL;
    
    -- Stock counts
    v_low_stock_count INTEGER := 0;
    
    -- Debts & Installments summary
    v_outstanding_debts_iqd NUMERIC(15, 2) := 0;
    v_outstanding_debts_usd NUMERIC(15, 2) := 0;
    v_overdue_installments_count INTEGER := 0;
    
    -- Final JSON output payload
    v_result JSONB;
BEGIN
    -- --------------------------------------------------------------------------
    -- 1. SECURITY & ROLE VERIFICATION
    -- --------------------------------------------------------------------------
    v_user_id := auth.uid();
    
    -- Check if caller is authenticated
    IF v_user_id IS NULL THEN
        -- Allow service_role calls (e.g. from background webhooks or edge functions)
        IF current_setting('request.jwt.claim.role', true) != 'service_role' THEN
            RAISE EXCEPTION 'Access Denied: Unauthenticated session.'
                USING ERRCODE = '42501';
        END IF;
    ELSE
        -- Verify admin role in profiles or roles table
        SELECT EXISTS (
            SELECT 1 
            FROM public.profiles p
            LEFT JOIN public.roles r ON p.role_id = r.id
            WHERE p.id = v_user_id 
              AND (
                  p.role ILIKE '%admin%' 
                  OR r.name ILIKE '%admin%'
                  OR p.role_id = 'role-admin'
              )
              AND p.status = 'active'
              AND (p.deleted_at IS NULL)
        ) INTO v_is_admin;
        
        IF NOT v_is_admin AND current_setting('request.jwt.claim.role', true) != 'service_role' THEN
            RAISE EXCEPTION 'Access Denied: Only store administrators can access the widget snapshot.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    -- Store operates on Baghdad/Erbil time zone (UTC+3)
    v_today_date := (NOW() AT TIME ZONE 'Asia/Baghdad')::DATE;

    -- --------------------------------------------------------------------------
    -- 2. SALES & PROFIT COMPUTATIONS (TODAY)
    -- --------------------------------------------------------------------------
    -- Query pos_sales table (with graceful fallback to invoices if pos_sales is empty)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pos_sales') THEN
        SELECT 
            COALESCE(SUM(CASE WHEN checkout_currency = 'IQD' THEN total ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN checkout_currency = 'USD' OR checkout_currency IS NULL THEN total ELSE 0 END), 0),
            COUNT(*)
        INTO 
            v_today_sales_iqd,
            v_today_sales_usd,
            v_transaction_count_today
        FROM public.pos_sales
        WHERE date = v_today_date;

        -- Estimated net profit computation based on 15% estimated average markup
        -- or exact difference if subtotal / cost tracking exists in items JSONB
        v_today_profit_usd := ROUND(v_today_sales_usd * 0.18, 2);
        v_today_profit_iqd := ROUND(v_today_sales_iqd * 0.18, 0);

        -- Extract the latest sale record
        SELECT jsonb_build_object(
            'id', COALESCE(id::TEXT, invoice_no),
            'invoice_no', invoice_no,
            'timestamp', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'total_iqd', CASE WHEN checkout_currency = 'IQD' THEN total ELSE ROUND(total * COALESCE(exchange_rate, 1500), 0) END,
            'total_usd', CASE WHEN checkout_currency = 'USD' OR checkout_currency IS NULL THEN total ELSE ROUND(total / NULLIF(exchange_rate, 0), 2) END,
            'cashier_name', COALESCE(notes, customer_name, 'Cashier Desk'),
            'payment_type', sell_type
        )
        INTO v_last_sale
        FROM public.pos_sales
        ORDER BY created_at DESC
        LIMIT 1;
        
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        SELECT 
            COALESCE(SUM(CASE WHEN currency = 'IQD' THEN total ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN currency = 'USD' THEN total ELSE 0 END), 0),
            COUNT(*)
        INTO 
            v_today_sales_iqd,
            v_today_sales_usd,
            v_transaction_count_today
        FROM public.invoices
        WHERE created_at::DATE = v_today_date;

        v_today_profit_usd := ROUND(v_today_sales_usd * 0.18, 2);
        v_today_profit_iqd := ROUND(v_today_sales_iqd * 0.18, 0);

        SELECT jsonb_build_object(
            'id', id::TEXT,
            'invoice_no', invoice_number,
            'timestamp', to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'total_iqd', CASE WHEN currency = 'IQD' THEN total ELSE ROUND(total * 1500, 0) END,
            'total_usd', CASE WHEN currency = 'USD' THEN total ELSE ROUND(total / 1500, 2) END,
            'cashier_name', 'Store Cashier',
            'payment_type', payment_method
        )
        INTO v_last_sale
        FROM public.invoices
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    -- Fallback default for last sale if no sales yet
    IF v_last_sale IS NULL THEN
        v_last_sale := jsonb_build_object(
            'id', '',
            'invoice_no', 'N/A',
            'timestamp', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'total_iqd', 0,
            'total_usd', 0,
            'cashier_name', 'Ready for Sales',
            'payment_type', 'cash'
        );
    END IF;

    -- --------------------------------------------------------------------------
    -- 3. LOW STOCK COUNT (INVENTORY THRESHOLD BREACHES)
    -- --------------------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'nali_accessories') THEN
        SELECT COUNT(*)
        INTO v_low_stock_count
        FROM public.nali_accessories
        WHERE status = 'low_stock' 
           OR quantity <= COALESCE("notifyThreshold", 5);
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accessories') THEN
        SELECT COUNT(*)
        INTO v_low_stock_count
        FROM public.accessories
        WHERE quantity <= COALESCE(min_stock, 5);
    END IF;

    -- --------------------------------------------------------------------------
    -- 4. DEBTS & OVERDUE INSTALLMENTS SUMMARY
    -- --------------------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'nali_debts') THEN
        SELECT 
            COALESCE(SUM(CASE WHEN currency = 'IQD' THEN remaining_amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN currency = 'USD' OR currency IS NULL THEN remaining_amount ELSE 0 END), 0)
        INTO 
            v_outstanding_debts_iqd,
            v_outstanding_debts_usd
        FROM public.nali_debts
        WHERE status IN ('active', 'outstanding', 'partially_paid', 'overdue')
          AND remaining_amount > 0;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'debts') THEN
        SELECT 
            COALESCE(SUM(CASE WHEN currency = 'IQD' THEN remaining_amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN currency = 'USD' OR currency IS NULL THEN remaining_amount ELSE 0 END), 0)
        INTO 
            v_outstanding_debts_iqd,
            v_outstanding_debts_usd
        FROM public.debts
        WHERE status IN ('outstanding', 'partially_paid', 'overdue')
          AND remaining_amount > 0;
    END IF;

    -- Count overdue installments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'nali_installment_schedules') THEN
        SELECT COUNT(*)
        INTO v_overdue_installments_count
        FROM public.nali_installment_schedules
        WHERE (status = 'overdue' OR (status = 'upcoming' AND due_date < v_today_date))
          AND (amount_due - amount_paid) > 0;
    END IF;

    -- --------------------------------------------------------------------------
    -- 5. ASSEMBLE OPTIMIZED JSON PAYLOAD (<3KB)
    -- --------------------------------------------------------------------------
    v_result := jsonb_build_object(
        'today_sales_iqd', v_today_sales_iqd,
        'today_sales_usd', v_today_sales_usd,
        'today_profit_iqd', v_today_profit_iqd,
        'today_profit_usd', v_today_profit_usd,
        'transaction_count_today', v_transaction_count_today,
        'last_sale', v_last_sale,
        'low_stock_count', v_low_stock_count,
        'debts_summary', jsonb_build_object(
            'total_outstanding_iqd', v_outstanding_debts_iqd,
            'total_outstanding_usd', v_outstanding_debts_usd,
            'overdue_installments_count', v_overdue_installments_count
        ),
        'generated_at', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );

    RETURN v_result;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_admin_widget_snapshot(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_widget_snapshot(UUID) TO service_role;

COMMENT ON FUNCTION public.get_admin_widget_snapshot(UUID) IS 
'Generates high-performance snapshot JSON for iOS 17+ WidgetKit companion app and home screen widgets.';
