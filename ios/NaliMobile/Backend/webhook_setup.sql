-- ==============================================================================
-- NALI MOBILE POS - APNS DEVICE TOKENS & WEBHOOK TRIGGER REGISTRATION
-- Purpose: 1. Creates storage for iOS APNs Push Notification device tokens
--          2. Attaches Database Webhook trigger on pos_sales table
-- ==============================================================================

-- 1. Table for storing registered iOS device tokens (per authenticated administrator)
CREATE TABLE IF NOT EXISTS public.apns_device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL UNIQUE,
    environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('sandbox', 'production')),
    device_model TEXT,
    os_version TEXT,
    app_version TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.apns_device_tokens ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert and update their own device token
CREATE POLICY "Users can manage their own device tokens" 
ON public.apns_device_tokens 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role full access on apns_device_tokens"
ON public.apns_device_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Database Webhook Trigger (or pg_net trigger) for POS sales insertion
-- This automatically fires the Edge Function 'notify-widget-reload'
CREATE OR REPLACE FUNCTION public.trigger_notify_widget_reload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_edge_function_url TEXT;
    v_service_key TEXT;
    v_payload JSONB;
BEGIN
    -- Read configuration or environment defaults
    v_edge_function_url := 'https://' || current_setting('request.jwt.claim.iss', true) || '/functions/v1/notify-widget-reload';
    
    v_payload := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', row_to_json(NEW)::jsonb,
        'old_record', NULL
    );

    -- If pg_net extension is available, dispatch asynchronous HTTP POST request
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        PERFORM net.http_post(
            url := v_edge_function_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || coalesce(current_setting('app.settings.service_role_key', true), '')
            ),
            body := v_payload
        );
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Do not fail the transaction if push notification trigger fails
        RAISE WARNING 'Widget push notification trigger notice: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate on pos_sales
DROP TRIGGER IF EXISTS trg_notify_widget_on_pos_sale ON public.pos_sales;
CREATE TRIGGER trg_notify_widget_on_pos_sale
AFTER INSERT ON public.pos_sales
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_widget_reload();

COMMENT ON TABLE public.apns_device_tokens IS 'Stores Apple Push Notification Service (APNs) device tokens for WidgetKit live updates';
