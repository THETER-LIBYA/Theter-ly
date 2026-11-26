-- Tether Libya | تيتر ليبيا - Complete PostgreSQL & Supabase Schema
-- Includes strict RLS, immutable financial ledger, immutable audit log, and storage buckets.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT 'مستخدم تيتر ليبيا',
  first_name TEXT,
  last_name TEXT,
  city_area TEXT,
  passport_image_url TEXT,
  birth_cert_image_url TEXT,
  kyc_note TEXT,
  terms_accepted_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  last_active_at TIMESTAMPTZ,
  email TEXT,
  avatar_url TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'unverified' CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'needs_reverification')),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'support', 'finance', 'admin', 'super_admin')),
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  ban_reason TEXT,
  total_volume_usdt NUMERIC(18, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users (phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

-- 2. Resala OTP Sessions
CREATE TABLE IF NOT EXISTS public.otp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  resala_reference TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON public.otp_sessions (phone, created_at DESC);

-- 3. User Sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.user_sessions (user_id);

-- 4. Exchange Rates & Limits
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id TEXT PRIMARY KEY DEFAULT 'default',
  source TEXT NOT NULL DEFAULT 'prices_ly' CHECK (source IN ('prices_ly', 'manual')),
  base_usd_lyd NUMERIC(12, 4) NOT NULL DEFAULT 12.500,
  buy_margin NUMERIC(12, 4) NOT NULL DEFAULT 1.500,
  sell_margin NUMERIC(12, 4) NOT NULL DEFAULT -1.500,
  buy_rate NUMERIC(12, 4) NOT NULL DEFAULT 14.000,
  sell_rate NUMERIC(12, 4) NOT NULL DEFAULT 11.000,
  auto_update_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  buy_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sell_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  min_order_usdt NUMERIC(12, 2) NOT NULL DEFAULT 10,
  max_order_usdt NUMERIC(12, 2) NOT NULL DEFAULT 25000,
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Payment Accounts (LYPay, OnePay, Bank Accounts)
CREATE TABLE IF NOT EXISTS public.payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT NOT NULL CHECK (method IN ('lypay', 'onepay', 'bank_transfer')),
  bank_name TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  account_number TEXT NOT NULL,
  iban TEXT,
  phone_or_id TEXT,
  instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Platform Wallets (TRON TRC20)
CREATE TABLE IF NOT EXISTS public.platform_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'TRC20' CHECK (network IN ('TRC20')),
  address TEXT UNIQUE NOT NULL,
  qr_code_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Orders (Buy & Sell)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  usdt_amount NUMERIC(18, 4) NOT NULL CHECK (usdt_amount > 0),
  rate_applied NUMERIC(12, 4) NOT NULL CHECK (rate_applied > 0),
  lyd_amount NUMERIC(18, 4) NOT NULL CHECK (lyd_amount > 0),
  payment_method TEXT CHECK (payment_method IN ('lypay', 'onepay', 'bank_transfer', 'tron_trc20')),
  bank_account_id UUID REFERENCES public.payment_accounts(id),
  platform_wallet_id UUID REFERENCES public.platform_wallets(id),
  sender_name TEXT,
  sender_bank TEXT,
  transfer_reference TEXT,
  receipt_url TEXT,
  customer_wallet_address TEXT,
  network TEXT NOT NULL DEFAULT 'TRC20',
  tx_hash TEXT UNIQUE,
  recipient_full_name TEXT,
  recipient_bank TEXT,
  recipient_account_number TEXT,
  recipient_iban TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (
    status IN ('pending_review', 'under_review', 'needs_edit', 'approved', 'completed', 'rejected', 'cancelled')
  ),
  admin_notes TEXT,
  outbound_transfer_ref TEXT,
  outbound_proof_url TEXT,
  reviewed_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_type ON public.orders (type);

-- 8. Order Status History
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_history_order ON public.order_status_history (order_id, created_at ASC);

-- 9. Immutable Financial Ledger
CREATE TABLE IF NOT EXISTS public.financial_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('buy_inflow', 'buy_outflow', 'sell_inflow', 'sell_outflow', 'platform_margin')),
  currency TEXT NOT NULL CHECK (currency IN ('USDT', 'LYD')),
  amount NUMERIC(18, 4) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  description TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ledger_order ON public.financial_ledger (order_id);

CREATE OR REPLACE FUNCTION public.prevent_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Modifications and deletions are prohibited on immutable ledger/audit tables.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_ledger ON public.financial_ledger;
CREATE TRIGGER trg_immutable_ledger
BEFORE UPDATE OR DELETE ON public.financial_ledger
FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation();

-- 10. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  push_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, is_read, created_at DESC);

-- 11. Notification Templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  channel_push BOOLEAN NOT NULL DEFAULT TRUE,
  channel_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. User Notification Preferences
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  order_updates BOOLEAN NOT NULL DEFAULT TRUE,
  rate_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  promotions BOOLEAN NOT NULL DEFAULT TRUE,
  admin_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  web_push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Web Push Subscriptions (VAPID)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_user ON public.push_subscriptions (user_id);

-- 14. Site Content & Branding
CREATE TABLE IF NOT EXISTS public.site_content (
  id TEXT PRIMARY KEY DEFAULT 'default',
  logo_url TEXT NOT NULL DEFAULT '/images/brand-icon.png',
  app_name_ar TEXT NOT NULL DEFAULT 'تيتر ليبيا',
  app_name_en TEXT NOT NULL DEFAULT 'Tether Libya',
  tagline_ar TEXT NOT NULL DEFAULT 'آمن .. سريع .. بكل ثقة',
  icon_192_url TEXT NOT NULL DEFAULT '/pwa-192x192.png',
  icon_512_url TEXT NOT NULL DEFAULT '/pwa-512x512.png',
  icon_maskable_url TEXT NOT NULL DEFAULT '/pwa-maskable-512x512.png',
  apple_touch_icon_url TEXT NOT NULL DEFAULT '/apple-touch-icon.png',
  promo_banner_title TEXT NOT NULL DEFAULT 'تيتر ليبيا ..',
  promo_banner_subtitle TEXT NOT NULL DEFAULT 'اختيارك الأفضل',
  promo_banner_image_url TEXT NOT NULL DEFAULT '/images/promo-banner.jpg',
  primary_color TEXT NOT NULL DEFAULT '#10F5A6',
  accent_color TEXT NOT NULL DEFAULT '#0D8BFF',
  support_phone TEXT NOT NULL DEFAULT '+218 91 000 0000',
  support_whatsapp TEXT NOT NULL DEFAULT 'https://wa.me/218910000000',
  support_email TEXT NOT NULL DEFAULT 'support@tetherlibya.ly',
  telegram_url TEXT NOT NULL DEFAULT 'https://t.me/tetherlibya',
  facebook_url TEXT NOT NULL DEFAULT 'https://facebook.com/tetherlibya',
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  maintenance_message TEXT NOT NULL DEFAULT 'المنصة تحت الصيانة المجدولة حالياً، سنعود قريباً.',
  public_pages_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. SEO Settings
CREATE TABLE IF NOT EXISTS public.seo_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  keywords TEXT NOT NULL DEFAULT '',
  canonical_url TEXT NOT NULL DEFAULT '',
  og_title TEXT NOT NULL DEFAULT '',
  og_description TEXT NOT NULL DEFAULT '',
  og_image_url TEXT NOT NULL DEFAULT '/og-image.png',
  noindex BOOLEAN NOT NULL DEFAULT FALSE,
  schema_type TEXT NOT NULL DEFAULT 'WebPage',
  schema_json JSONB,
  ga4_measurement_id TEXT NOT NULL DEFAULT '',
  gsc_verification_code TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Immutable Admin Audit Log
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id),
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_logs (created_at DESC);

DROP TRIGGER IF EXISTS trg_immutable_audit ON public.admin_audit_logs;
CREATE TRIGGER trg_immutable_audit
BEFORE UPDATE OR DELETE ON public.admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation();

-- 16b. Support / Contact Messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'استفسار عام',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  admin_reply_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_messages_status ON public.support_messages (status, created_at DESC);

-- 17. Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Public read-only policies for non-sensitive public configuration
CREATE POLICY "Public read exchange rates" ON public.exchange_rates FOR SELECT USING (true);
CREATE POLICY "Public read active payment accounts" ON public.payment_accounts FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active platform wallets" ON public.platform_wallets FOR SELECT USING (is_active = true);
CREATE POLICY "Public read site content" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "Public read seo settings" ON public.seo_settings FOR SELECT USING (true);

-- User-scoped policies (when authenticated via Supabase Auth JWT or custom server role)
CREATE POLICY "Users read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users read own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own notification prefs" ON public.user_notification_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- Storage Buckets (run in Supabase SQL editor)
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('proofs', 'proofs', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc', 'kyc', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true) ON CONFLICT (id) DO NOTHING;

-- Upgrade statements (safe to re-run on existing Supabase deployments)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city_area TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS passport_image_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_cert_image_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_note TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_kyc_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_kyc_status_check CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'needs_reverification'));
