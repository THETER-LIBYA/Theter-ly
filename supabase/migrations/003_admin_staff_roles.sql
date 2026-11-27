-- Migration 003: Isolated Custom Roles, Staff & Role-Based Access Control (RBAC)
-- Separates app customers (public.users, strictly role='user') from Control Center roles & staff (public.admin_roles, public.admin_staff).
-- Safe to run multiple times (idempotent).

-- 1. Custom & Built-in Admin Roles Table (managed exclusively by Super Admin / Owner)
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  permissions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_roles_slug ON public.admin_roles (slug);

-- Seed default Tether Libya RBAC roles if absent
INSERT INTO public.admin_roles (slug, name_ar, description_ar, permissions_json, is_system)
VALUES
  (
    'admin',
    'مدير النظام (Admin)',
    'إدارة تشغيلية كاملة لكافة أقسام المنصة باستثناء إدارة الأدوار العليا',
    '["overview","orders","rates","payments","users","support","notifications","content","seo","audit"]'::jsonb,
    TRUE
  ),
  (
    'finance',
    'مدير المدفوعات والمالية (Finance)',
    'مراجعة الطلبات، اعتماد الإيصالات، إدارة الحسابات المصرفية والمحافظ، وضبط التسعير',
    '["overview","orders","rates","payments","audit"]'::jsonb,
    TRUE
  ),
  (
    'support',
    'مدير الدعم الفني (Support)',
    'متابعة تذاكر الدعم الفني ومراجعة توثيق هوية العملاء واستعراض الطلبات',
    '["overview","orders","users","support"]'::jsonb,
    TRUE
  ),
  (
    'moderator',
    'مراقب العمليات (Moderator)',
    'متابعة الطلبات وتوثيق الحسابات والرقابة على السجل الأمني والدعم',
    '["overview","orders","users","support","audit"]'::jsonb,
    TRUE
  ),
  (
    'editor',
    'محرر المحتوى والإعلانات (Editor)',
    'إدارة الهوية البصرية، الإشعارات، الصفحات العامة، وإعدادات محركات البحث SEO',
    '["overview","notifications","content","seo"]'::jsonb,
    TRUE
  )
ON CONFLICT (slug) DO NOTHING;

-- 2. Staff Accounts Table (managed exclusively by Super Admin via ADMIN_PASSCODE)
CREATE TABLE IF NOT EXISTS public.admin_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  permissions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.admin_staff DROP CONSTRAINT IF EXISTS admin_staff_role_check;
CREATE INDEX IF NOT EXISTS idx_admin_staff_username ON public.admin_staff (username);
CREATE INDEX IF NOT EXISTS idx_admin_staff_role ON public.admin_staff (role);
CREATE INDEX IF NOT EXISTS idx_admin_staff_active ON public.admin_staff (is_active);

-- 3. Isolated Admin & Staff Sessions Table
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('super_admin', 'staff')),
  staff_id UUID REFERENCES public.admin_staff(id) ON DELETE CASCADE,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON public.admin_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_staff ON public.admin_sessions (staff_id);

-- 4. Enable strict RLS (accessed via server-side service role only)
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- 5. Decouple admin/staff actor references from customer public.users table
ALTER TABLE public.exchange_rates DROP CONSTRAINT IF EXISTS exchange_rates_updated_by_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_reviewed_by_fkey;
ALTER TABLE public.order_status_history DROP CONSTRAINT IF EXISTS order_status_history_changed_by_fkey;
ALTER TABLE public.financial_ledger DROP CONSTRAINT IF EXISTS financial_ledger_created_by_fkey;
ALTER TABLE public.admin_audit_logs DROP CONSTRAINT IF EXISTS admin_audit_logs_actor_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.user_notification_preferences DROP CONSTRAINT IF EXISTS user_notification_preferences_user_id_fkey;
ALTER TABLE public.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;

-- 6. Lock public.users so all registered app accounts remain customers only
UPDATE public.users SET role = 'user' WHERE role <> 'user';
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role = 'user');
