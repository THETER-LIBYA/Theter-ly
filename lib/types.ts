export type UserRole = 'user' | 'support' | 'finance' | 'admin' | 'super_admin';
export type KycStatus = 'unverified' | 'pending' | 'verified' | 'needs_reverification';
export type OrderType = 'buy' | 'sell';
export type PaymentMethod = 'lypay' | 'onepay' | 'bank_transfer' | 'tron_trc20';
export type OrderStatus =
  | 'pending_review'
  | 'under_review'
  | 'needs_edit'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface User {
  id: string;
  phone: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  city_area: string | null;
  passport_image_url: string | null;
  birth_cert_image_url: string | null;
  kyc_note: string | null;
  terms_accepted_at: string | null;
  onboarding_completed: boolean;
  last_active_at: string | null;
  email: string | null;
  avatar_url: string | null;
  kyc_status: KycStatus;
  role: UserRole;
  is_banned: boolean;
  ban_reason: string | null;
  total_volume_usdt: number;
  created_at: string;
  updated_at: string;
}

export interface ExchangeRates {
  id: string;
  source: 'prices_ly' | 'manual';
  base_usd_lyd: number;
  buy_margin: number;
  sell_margin: number;
  buy_rate: number;
  sell_rate: number;
  auto_update_enabled: boolean;
  buy_enabled: boolean;
  sell_enabled: boolean;
  min_order_usdt: number;
  max_order_usdt: number;
  last_fetched_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface PaymentAccount {
  id: string;
  method: 'lypay' | 'onepay' | 'bank_transfer';
  bank_name: string;
  account_holder: string;
  account_number: string;
  iban: string | null;
  phone_or_id: string | null;
  instructions: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlatformWallet {
  id: string;
  label: string;
  network: 'TRC20';
  address: string;
  qr_code_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  idempotency_key: string;
  user_id: string;
  type: OrderType;
  usdt_amount: number;
  rate_applied: number;
  lyd_amount: number;
  payment_method: PaymentMethod | null;
  bank_account_id: string | null;
  platform_wallet_id: string | null;
  sender_name: string | null;
  sender_bank: string | null;
  transfer_reference: string | null;
  receipt_url: string | null;
  customer_wallet_address: string | null;
  network: string;
  tx_hash: string | null;
  recipient_full_name: string | null;
  recipient_bank: string | null;
  recipient_account_number: string | null;
  recipient_iban: string | null;
  status: OrderStatus;
  admin_notes: string | null;
  outbound_transfer_ref: string | null;
  outbound_proof_url: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  order_id: string;
  user_id: string;
  entry_type: 'buy_inflow' | 'buy_outflow' | 'sell_inflow' | 'sell_outflow' | 'platform_margin';
  currency: 'USDT' | 'LYD';
  amount: number;
  direction: 'credit' | 'debit';
  description: string;
  created_by: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  order_id: string | null;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  push_status: string;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  key: string;
  name_ar: string;
  title_template: string;
  body_template: string;
  is_enabled: boolean;
  channel_push: boolean;
  channel_in_app: boolean;
  updated_at: string;
}

export interface UserNotificationPreferences {
  user_id: string;
  order_updates: boolean;
  rate_alerts: boolean;
  promotions: boolean;
  admin_alerts: boolean;
  web_push_enabled: boolean;
  updated_at: string;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PublicPageContent {
  slug: string;
  title_ar: string;
  subtitle_ar: string;
  body_ar: string;
  is_visible: boolean;
}

export interface SiteContent {
  id: string;
  logo_url: string;
  app_name_ar: string;
  app_name_en: string;
  tagline_ar: string;
  icon_192_url: string;
  icon_512_url: string;
  icon_maskable_url: string;
  apple_touch_icon_url: string;
  promo_banner_title: string;
  promo_banner_subtitle: string;
  promo_banner_image_url: string;
  primary_color: string;
  accent_color: string;
  support_phone: string;
  support_whatsapp: string;
  support_email: string;
  telegram_url: string;
  facebook_url: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  public_pages_json: Record<string, PublicPageContent>;
  updated_at: string;
}

export interface SeoSetting {
  id: string;
  page_slug: string;
  title: string;
  description: string;
  keywords: string;
  canonical_url: string;
  og_title: string;
  og_description: string;
  og_image_url: string;
  noindex: boolean;
  schema_type: string;
  schema_json: Record<string, unknown> | null;
  ga4_measurement_id: string;
  gsc_verification_code: string;
  updated_at: string;
}

export interface AdminAuditLog {
  id: string;
  actor_id: string | null;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string;
  details_json: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface OtpSession {
  id: string;
  phone: string;
  pin_hash: string;
  resala_reference: string | null;
  attempts: number;
  expires_at: string;
  verified_at: string | null;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  token_hash: string;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

export interface SupportMessage {
  id: string;
  name: string;
  phone: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  admin_reply_note: string | null;
  created_at: string;
  updated_at: string;
}

export type StaffRole = string;

export type AdminPermission =
  | 'overview'
  | 'orders'
  | 'rates'
  | 'payments'
  | 'users'
  | 'support'
  | 'notifications'
  | 'content'
  | 'seo'
  | 'audit'
  | 'staff';

export const STAFF_ASSIGNABLE_PERMISSIONS: AdminPermission[] = [
  'overview',
  'orders',
  'rates',
  'payments',
  'users',
  'support',
  'notifications',
  'content',
  'seo',
  'audit',
];

export const ALL_ADMIN_PERMISSIONS: AdminPermission[] = [
  ...STAFF_ASSIGNABLE_PERMISSIONS,
  'staff',
];

export const STAFF_ROLE_LABELS: Record<string, string> = {
  super_admin: 'المالك / المدير العام (Super Admin)',
  admin: 'مدير النظام (Admin)',
  finance: 'مدير المدفوعات والمالية (Finance)',
  support: 'مدير الدعم الفني (Support)',
  moderator: 'مراقب العمليات (Moderator)',
  editor: 'محرر المحتوى والإعلانات (Editor)',
  marketing: 'التسويق والإشعارات (Marketing)',
  manager: 'مشرف تشغيلي (Manager)',
};

export const STAFF_ROLE_DEFAULT_PERMISSIONS: Record<string, AdminPermission[]> = {
  admin: [
    'overview',
    'orders',
    'rates',
    'payments',
    'users',
    'support',
    'notifications',
    'content',
    'seo',
    'audit',
  ],
  finance: ['overview', 'orders', 'rates', 'payments', 'audit'],
  support: ['overview', 'orders', 'users', 'support'],
  moderator: ['overview', 'orders', 'users', 'support', 'audit'],
  editor: ['overview', 'notifications', 'content', 'seo'],
  marketing: ['overview', 'notifications', 'content', 'seo'],
  manager: [
    'overview',
    'orders',
    'rates',
    'payments',
    'users',
    'support',
    'notifications',
    'content',
    'seo',
    'audit',
  ],
};

export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  overview: 'عرض التحليلات والمؤشرات المالية',
  orders: 'إدارة واستعراض الطلبات',
  rates: 'إدارة التسعير والهوامش',
  payments: 'إدارة الحسابات المصرفية والمحافظ',
  users: 'إدارة سجلات العملاء وتوثيق الهوية',
  support: 'متابعة وتنفيذ تذاكر الدعم الفني',
  notifications: 'إدارة الإشعارات والقوالب',
  content: 'إدارة المحتوى والهوية البصرية',
  seo: 'إعدادات المنصة وSEO',
  audit: 'عرض السجل المالي والتدقيق الأمني (Audit)',
  staff: 'إدارة الأدوار والصلاحيات (RBAC)',
};

export interface AdminPermissionDirectoryItem {
  key: AdminPermission;
  title: string;
  category: string;
  description: string;
}

export const ADMIN_PERMISSIONS_DIRECTORY: AdminPermissionDirectoryItem[] = [
  {
    key: 'orders',
    title: 'إدارة واستعراض الطلبات',
    category: 'العمليات',
    description: 'الاطلاع على كافة طلبات الشراء والبيع، فحص إيصالات الدفع ومعاملات TRON، واعتماد أو رفض الطلبات.',
  },
  {
    key: 'rates',
    title: 'إدارة التسعير والهوامش',
    category: 'المالية',
    description: 'تعديل سعر الصرف الأساسي، هوامش الشراء والبيع، حدود الطلبات اليومية، وإيقاف أو تشغيل التداول.',
  },
  {
    key: 'payments',
    title: 'إدارة الحسابات المصرفية والمحافظ',
    category: 'المالية',
    description: 'إضافة وتعديل حسابات المصارف الليبية (LYPay وOnePay والتحويل المصرفي) وعناوين محافظ TRON (TRC20).',
  },
  {
    key: 'users',
    title: 'إدارة سجلات العملاء وتوثيق الهوية',
    category: 'المستخدمون',
    description: 'مراجعة جوازات السفر وشهادات الميلاد، اعتماد التوثيق أو طلب إعادة التوثيق، وتعليق أو تفعيل حسابات العملاء.',
  },
  {
    key: 'support',
    title: 'متابعة وتنفيذ تذاكر الدعم الفني',
    category: 'الدعم والخدمات',
    description: 'استعراض رسائل العملاء من صفحة التواصل وتحديث حالة المعالجة وإضافة ملاحظات فريق الدعم.',
  },
  {
    key: 'notifications',
    title: 'إدارة الإشعارات والقوالب',
    category: 'التسويق والتواصل',
    description: 'إرسال إشعارات جماعية أو مخصصة داخل التطبيق وعبر Web Push وضبط قوالب التنبيهات التلقائية.',
  },
  {
    key: 'content',
    title: 'إدارة المحتوى والهوية البصرية',
    category: 'المحتوى',
    description: 'تعديل شعار المنصة وأيقونات التطبيق، البانر الإعلاني، وضع الصيانة، بيانات التواصل، ومحتوى الصفحات العامة.',
  },
  {
    key: 'seo',
    title: 'إعدادات المنصة وSEO',
    category: 'النظام',
    description: 'تحديث عناوين محركات البحث، الكلمات المفتاحية، بيانات OpenGraph وSchema.org لكل صفحة عامة.',
  },
  {
    key: 'overview',
    title: 'عرض التحليلات والمؤشرات المالية',
    category: 'التقارير',
    description: 'الاطلاع على مؤشرات التداول اليومية والأرباح والعمولات وجاهزية التكاملات في لوحة القيادة.',
  },
  {
    key: 'audit',
    title: 'عرض السجل المالي والتدقيق الأمني (Audit)',
    category: 'الأمان',
    description: 'مراقبة القيود المالية غير القابلة للتعديل وسجل كافة العمليات الإدارية الحساسة وعناوين الـ IP.',
  },
  {
    key: 'staff',
    title: 'إدارة الأدوار والصلاحيات (RBAC)',
    category: 'الإدارة العليا',
    description: 'إنشاء الأدوار المخصصة، ضبط مصفوفة الصلاحيات، وتعيين طاقم العمل (حصري للمالك / المدير العام فقط).',
  },
];

export interface AdminRoleDefinition {
  id: string;
  slug: string;
  name_ar: string;
  description_ar: string;
  permissions_json: AdminPermission[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminStaff {
  id: string;
  full_name: string;
  username: string;
  password_hash: string;
  role: StaffRole;
  permissions_json: AdminPermission[];
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminSession {
  id: string;
  actor_type: 'super_admin' | 'staff';
  staff_id: string | null;
  actor_name: string;
  actor_role: string;
  token_hash: string;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}


