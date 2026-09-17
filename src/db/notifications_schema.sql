-- ============================================================================
-- NALI POS - Enterprise Notification & Alert System Migration
-- Schema: notifications_schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_role VARCHAR(50) NOT NULL DEFAULT 'All',
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

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications (recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON public.notifications (target_role, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications (priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_metadata_gin ON public.notifications USING GIN (metadata);
