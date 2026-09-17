-- EXTENDED NALI POS SCHEMA
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    username TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    role_id TEXT,
    branch_id TEXT,
    status TEXT DEFAULT 'active',
    failed_login_attempts INTEGER DEFAULT 0,
    last_login_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    color TEXT
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id TEXT PRIMARY KEY,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    label TEXT,
    description TEXT,
    category TEXT
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id TEXT REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id TEXT REFERENCES public.permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS public.notification_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id TEXT REFERENCES public.notifications(id) ON DELETE CASCADE,
    reference_type TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(notification_id, reference_type, reference_id)
);

-- Enable RLS and permissive policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Enable all access roles" ON public.roles FOR ALL USING (true);
CREATE POLICY "Enable all access permissions" ON public.permissions FOR ALL USING (true);
CREATE POLICY "Enable all access role_permissions" ON public.role_permissions FOR ALL USING (true);
CREATE POLICY "Enable all access notifications" ON public.notifications FOR ALL USING (true);
CREATE POLICY "Enable all access notification_references" ON public.notification_references FOR ALL USING (true);
