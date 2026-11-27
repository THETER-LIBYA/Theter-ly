-- Migration 003: Isolated Staff & Role-Based Access Control (RBAC)
-- Separates app customers (public.users, strictly role='user') from Control Center staff (public.admin_staff).
-- Safe to run multiple times (idempotent).

-- 1. Staff Accounts Table (managed exclusively by Super Admin via ADMIN_PASSCODE)
CREATE TABLE IF NOT EXISTS public.admin_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('support', 'finance', 'marketing', 'manager')),
  permissions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_staff_username ON public.admin_staff (username);
CREATE INDEX IF NOT EXISTS idx_admin_staff_active ON public.admin_staff (is_active);

-- 2. Isolated Admin & Staff Sessions Table
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

-- 3. Enable strict RLS (accessed via server-side service role only)
ALTER TABLE public.admin_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- 4. Decouple admin/staff actor references from customer public.users table
ALTER TABLE public.exchange_rates DROP CONSTRAINT IF EXISTS exchange_rates_updated_by_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_reviewed_by_fkey;
ALTER TABLE public.order_status_history DROP CONSTRAINT IF EXISTS order_status_history_changed_by_fkey;
ALTER TABLE public.financial_ledger DROP CONSTRAINT IF EXISTS financial_ledger_created_by_fkey;
ALTER TABLE public.admin_audit_logs DROP CONSTRAINT IF EXISTS admin_audit_logs_actor_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.user_notification_preferences DROP CONSTRAINT IF EXISTS user_notification_preferences_user_id_fkey;
ALTER TABLE public.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;

-- 5. Lock public.users so all registered app accounts remain customers only
UPDATE public.users SET role = 'user' WHERE role <> 'user';
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role = 'user');
