import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { getWritableDataDir } from './storage';
import { getSupabaseAdmin, isSupabaseConfigured } from './supabase';
import {
  AdminAuditLog,
  AdminPermission,
  AdminSession,
  AdminStaff,
  AppNotification,
  ExchangeRates,
  KycStatus,
  LedgerEntry,
  NotificationTemplate,
  Order,
  OrderStatus,
  OrderStatusHistory,
  OtpSession,
  PaymentAccount,
  PlatformWallet,
  PushSubscriptionRecord,
  SeoSetting,
  SiteContent,
  StaffRole,
  SupportMessage,
  User,
  UserNotificationPreferences,
  UserRole,
  UserSession,
} from './types';

export const SUPER_ADMIN_ACTOR_ID = '00000000-0000-4000-8000-000000000001';

interface LocalStore {
  users: User[];
  otp_sessions: OtpSession[];
  user_sessions: UserSession[];
  admin_staff?: AdminStaff[];
  admin_sessions?: AdminSession[];
  exchange_rates: ExchangeRates;
  payment_accounts: PaymentAccount[];
  platform_wallets: PlatformWallet[];
  orders: Order[];
  order_status_history: OrderStatusHistory[];
  financial_ledger: LedgerEntry[];
  notifications: AppNotification[];
  notification_templates: NotificationTemplate[];
  user_notification_preferences: UserNotificationPreferences[];
  push_subscriptions: PushSubscriptionRecord[];
  site_content: SiteContent;
  seo_settings: SeoSetting[];
  admin_audit_logs: AdminAuditLog[];
  support_messages?: SupportMessage[];
  admin_credential_hash: string | null;
  vapid_keys: { publicKey: string; privateKey: string } | null;
}

const DATA_DIR = getWritableDataDir();
const DATA_FILE = path.join(DATA_DIR, 'tether-libya-db.json');

const DEFAULT_PUBLIC_PAGES = {
  about: {
    slug: 'about',
    title_ar: 'من نحن',
    subtitle_ar: 'تيتر ليبيا — بوابة التداول المباشر للتيتر في ليبيا',
    body_ar:
      'تيتر ليبيا (Tether Libya) منصة مالية متخصصة في تسهيل عمليات شراء وبيع USDT بالدينار الليبي بشكل مباشر وآمن، دون الحاجة لمحفظة داخلية، مع مراجعة يدوية دقيقة لكل معاملة وشفافية كاملة في التسعير المحدث لحظياً ووسائل الدفع المحلية المعتمدة.',
    is_visible: true,
  },
  'how-it-works': {
    slug: 'how-it-works',
    title_ar: 'آلية الشراء والبيع',
    subtitle_ar: 'خطوات واضحة لتنفيذ طلبك مباشرة وبأمان',
    body_ar:
      'عند شراء USDT: أدخل المبلغ المطلوب، اختر وسيلة الدفع (LYPay أو OnePay)، حوّل القيمة للحساب المعروض وارفع إيصال الدفع مع عنوان محفظة TRON الخاصة بك. عند بيع USDT: أرسل الكمية إلى عنوان TRON الخاص بالمنصة، أدخل Hash المعاملة وبيانات حسابك المصرفي الليبي ليقوم المشرفون بمراجعة التحويل وتنفيذ الصرف يدوياً.',
    is_visible: true,
  },
  faq: {
    slug: 'faq',
    title_ar: 'الأسئلة الشائعة',
    subtitle_ar: 'إجابات وافية حول الشراء والبيع والتحقق وتوثيق الحساب',
    body_ar:
      'تتم جميع العمليات مباشرة بين محفظتك وحسابك المصرفي دون الاحتفاظ بأرصدة داخلية. وقت المراجعة المعتاد يتراوح بين 5 إلى 30 دقيقة خلال ساعات العمل. جميع المعاملات تخضع للتحقق اليدوي من فريق الامتثال والإشراف المالي لضمان حماية الطرفين.',
    is_visible: true,
  },
  contact: {
    slug: 'contact',
    title_ar: 'اتصل بنا والدعم',
    subtitle_ar: 'فريق الدعم الفني والمراجعة في خدمتك على مدار الساعة',
    body_ar:
      'يمكنك التواصل معنا لمتابعة الطلبات أو الاستفسار عن وسائل الدفع وتوثيق الحساب عبر قنوات الدعم الرسمية أو إرسال تذكرة دعم مباشرة من هذه الصفحة.',
    is_visible: true,
  },
  terms: {
    slug: 'terms',
    title_ar: 'الشروط والأحكام',
    subtitle_ar: 'الضوابط القانونية والتشغيلية وسياسة مكافحة غسل الأموال',
    body_ar:
      'باستخدامك لمنصة تيتر ليبيا فإنك تقر بموافقتك الكاملة على ضوابط الامتثال ومكافحة غسل الأموال، وتتحمل المسؤولية القانونية الكاملة عن مصدر الأموال والغرض من استخدامها مع إخلاء مسؤولية المنصة التام عن أي تصرف غير مشروع، كما تخضع كافة التحويلات للرقابة والتدقيق.',
    is_visible: true,
  },
  privacy: {
    slug: 'privacy',
    title_ar: 'سياسة الخصوصية',
    subtitle_ar: 'كيف نحمي بياناتك الشخصية ومستندات الهوية والإيصالات',
    body_ar:
      'نلتزم بحماية خصوصية مستخدمينا وتشفير الجلسات وحفظ وثائق التحقق والإيصالات المصرفية في مخازن معزولة لا يصل إليها إلا فريق المراجعة المختص. لا نبيع أو نشارك بياناتك مع أي أطراف تسويقية، وتُستخدم البيانات حصراً للتحقق من الهوية والامتثال وتنفيذ الطلبات.',
    is_visible: true,
  },
  'risk-disclosure': {
    slug: 'risk-disclosure',
    title_ar: 'الإفصاحات والمخاطر',
    subtitle_ar: 'إرشادات السلامة المالية وتنبيهات الشبكة والامتثال',
    body_ar:
      'التعامل في الأصول الرقمية يتطلب الحذر التام عند نسخ عناوين المحافظ واختيار الشبكة الصحيحة (TRON TRC20). التحويلات على البلوكشين غير قابلة للاسترجاع أو الإلغاء، والمنصة لا تقدم استشارات استثمارية بل توفر خدمة تنفيذ مباشر تخضع للمراجعة اليدوية.',
    is_visible: true,
  },
  security: {
    slug: 'security',
    title_ar: 'الأمان والموثوقية',
    subtitle_ar: 'معايير الحماية والتدقيق الصارم في تيتر ليبيا',
    body_ar:
      'نطبق تحققاً مزدوجاً لرقم الهاتف عبر رمز التحقق الهاتفي، وتوثيق الهوية بالوثائق الرسمية، ومنع تكرار أرقام الحوالات ومعرّفات البلوكشين (TX Hash)، مع سجل تدقيق غير قابل للتعديل ومراجعة بشرية مزدوجة قبل اعتماد أي تحويل صادر.',
    is_visible: true,
  },
  rewards: {
    slug: 'rewards',
    title_ar: 'المكافآت والعروض',
    subtitle_ar: 'مزايا الحسابات الموثقة وبرامج الولاء',
    body_ar:
      'يحصل العملاء ذوو الحسابات الموثقة والنشاط المنتظم على أولوية قصوى في سرعة المراجعة وهوامش سعرية تفضيلية وحدود تداول أعلى يتم الإعلان عنها عبر مركز الإشعارات الفورية.',
    is_visible: true,
  },
};

function buildDefaultSeo(): SeoSetting[] {
  const now = new Date().toISOString();
  const pages: Array<{
    slug: string;
    title: string;
    description: string;
    keywords: string;
    schema_type: string;
  }> = [
    {
      slug: 'home',
      title: 'تيتر ليبيا | Tether Libya — شراء وبيع USDT بالدينار الليبي',
      description:
        'منصة تيتر ليبيا لشراء وبيع USDT مباشرة عبر LYPay وOnePay وشبكة TRON بأسعار محدثة وأمان وموثوقية عالية.',
      keywords: 'تيتر ليبيا, Tether Libya, شراء USDT ليبيا, بيع USDT ليبيا, LYPay, OnePay, سعر الدولار ليبيا',
      schema_type: 'WebSite',
    },
    {
      slug: 'about',
      title: 'من نحن — تيتر ليبيا | Tether Libya',
      description:
        'تعرف على منصة تيتر ليبيا وآلية العمل المباشر لشراء وبيع التيتر USDT في ليبيا بأمان وشفافية.',
      keywords: 'من نحن, تيتر ليبيا, تداول USDT ليبيا',
      schema_type: 'Organization',
    },
    {
      slug: 'how-it-works',
      title: 'آلية الشراء والبيع — تيتر ليبيا',
      description:
        'دليل عملي لخطوات شراء وبيع USDT عبر LYPay وOnePay وشبكة TRON TRC20 مع المراجعة اليدوية.',
      keywords: 'كيف تشتري USDT في ليبيا, بيع USDT دينار ليبي, شبكة TRON TRC20',
      schema_type: 'WebPage',
    },
    {
      slug: 'faq',
      title: 'الأسئلة الشائعة — تيتر ليبيا',
      description:
        'أكثر الأسئلة شيوعاً حول أسعار الصرف، أوقات المراجعة، وسائل الدفع LYPay وOnePay، وتوثيق الحساب.',
      keywords: 'أسئلة شائعة تيتر ليبيا, دعم تيتر ليبيا',
      schema_type: 'FAQPage',
    },
    {
      slug: 'contact',
      title: 'اتصل بنا والدعم الفني — تيتر ليبيا',
      description: 'تواصل مع فريق الدعم الفني في تيتر ليبيا لمتابعة طلبات الشراء والبيع.',
      keywords: 'اتصل بنا تيتر ليبيا, الدعم الفني USDT ليبيا',
      schema_type: 'WebPage',
    },
    {
      slug: 'terms',
      title: 'الشروط والأحكام — تيتر ليبيا',
      description: 'الشروط والأحكام المنظمة لاستخدام منصة تيتر ليبيا وسياسة مكافحة غسل الأموال.',
      keywords: 'الشروط والأحكام تيتر ليبيا',
      schema_type: 'WebPage',
    },
    {
      slug: 'privacy',
      title: 'سياسة الخصوصية — تيتر ليبيا',
      description: 'سياسة الخصوصية وحماية البيانات الشخصية والمصرفية ومستندات التوثيق في تيتر ليبيا.',
      keywords: 'سياسة الخصوصية تيتر ليبيا',
      schema_type: 'WebPage',
    },
    {
      slug: 'risk-disclosure',
      title: 'الإفصاحات والمخاطر — تيتر ليبيا',
      description: 'تنبيهات المخاطر المالية وإرشادات التحويل عبر شبكة TRON TRC20 في تيتر ليبيا.',
      keywords: 'الإفصاحات والمخاطر, أمان التحويل TRC20',
      schema_type: 'WebPage',
    },
    {
      slug: 'security',
      title: 'الأمان والموثوقية — تيتر ليبيا',
      description: 'إجراءات الأمان والتحقق اليدوي وتوثيق الهوية وحماية المعاملات في منصة تيتر ليبيا.',
      keywords: 'أمان تيتر ليبيا, موثوقية تداول USDT',
      schema_type: 'WebPage',
    },
    {
      slug: 'rewards',
      title: 'المكافآت والعروض — تيتر ليبيا',
      description: 'تعرف على العروض والمزايا الحصرية لعملاء منصة تيتر ليبيا الموثقين.',
      keywords: 'عروض تيتر ليبيا, مكافآت USDT',
      schema_type: 'WebPage',
    },
  ];

  return pages.map((p) => ({
    id: crypto.randomUUID(),
    page_slug: p.slug,
    title: p.title,
    description: p.description,
    keywords: p.keywords,
    canonical_url: p.slug === 'home' ? '/' : `/${p.slug}`,
    og_title: p.title,
    og_description: p.description,
    og_image_url: '/og-image.png',
    noindex: false,
    schema_type: p.schema_type,
    schema_json: null,
    ga4_measurement_id: process.env.NEXT_PUBLIC_GA4_ID || '',
    gsc_verification_code: process.env.NEXT_PUBLIC_GSC_VERIFICATION || '',
    updated_at: now,
  }));
}

function buildDefaultTemplates(): NotificationTemplate[] {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      key: 'order_created',
      name_ar: 'إنشاء طلب جديد',
      title_template: 'تم استلام طلبك #{order_number}',
      body_template: 'تم تسجيل طلب {order_type} بقيمة {usdt_amount} USDT وهو الآن بانتظار المراجعة.',
      is_enabled: true,
      channel_push: true,
      channel_in_app: true,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      key: 'order_under_review',
      name_ar: 'بدء مراجعة الطلب',
      title_template: 'طلبك #{order_number} قيد المراجعة',
      body_template: 'بدأ المشرف المالي بمراجعة بيانات التحويل لطلبك #{order_number}.',
      is_enabled: true,
      channel_push: true,
      channel_in_app: true,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      key: 'order_needs_edit',
      name_ar: 'طلب تعديل بيانات',
      title_template: 'مطلوب تعديل بيانات الطلب #{order_number}',
      body_template: 'يرجى مراجعة ملاحظات المشرف وتحديث بيانات الطلب #{order_number}: {note}',
      is_enabled: true,
      channel_push: true,
      channel_in_app: true,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      key: 'order_approved',
      name_ar: 'اعتماد الطلب',
      title_template: 'تم اعتماد الطلب #{order_number}',
      body_template: 'تمت مطابقة التحويل بنجاح وجارٍ تنفيذ التحويل الصادر لطلبك #{order_number}.',
      is_enabled: true,
      channel_push: true,
      channel_in_app: true,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      key: 'order_completed',
      name_ar: 'اكتمال الطلب',
      title_template: 'اكتمل طلبك #{order_number} بنجاح',
      body_template: 'تم تنفيذ طلب {order_type} بمبلغ {usdt_amount} USDT بنجاح. يمكنك الاطلاع على الإثبات.',
      is_enabled: true,
      channel_push: true,
      channel_in_app: true,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      key: 'order_rejected',
      name_ar: 'رفض الطلب',
      title_template: 'تم رفض الطلب #{order_number}',
      body_template: 'تعذر اعتماد الطلب #{order_number}. السبب: {note}',
      is_enabled: true,
      channel_push: true,
      channel_in_app: true,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      key: 'rate_updated',
      name_ar: 'تنبيه تحديث الأسعار',
      title_template: 'تحديث أسعار USDT في تيتر ليبيا',
      body_template: 'سعر الشراء الحالي {buy_rate} د.ل وسعر البيع {sell_rate} د.ل.',
      is_enabled: true,
      channel_push: true,
      channel_in_app: true,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      key: 'admin_new_order',
      name_ar: 'تنبيه إداري لطلب جديد',
      title_template: 'طلب {order_type} جديد #{order_number}',
      body_template: 'وصل طلب جديد بقيمة {usdt_amount} USDT ({lyd_amount} د.ل) بانتظار المراجعة.',
      is_enabled: true,
      channel_push: true,
      channel_in_app: true,
      updated_at: now,
    },
  ];
}

function createInitialStore(): LocalStore {
  const now = new Date().toISOString();
  return {
    users: [],
    otp_sessions: [],
    user_sessions: [],
    admin_staff: [],
    admin_sessions: [],
    exchange_rates: {
      id: 'default',
      source: 'prices_ly',
      base_usd_lyd: 11.4,
      buy_margin: 0.25,
      sell_margin: -0.25,
      buy_rate: 11.65,
      sell_rate: 11.15,
      auto_update_enabled: true,
      buy_enabled: true,
      sell_enabled: true,
      min_order_usdt: 10,
      max_order_usdt: 25000,
      last_fetched_at: '1970-01-01T00:00:00.000Z',
      updated_by: null,
      updated_at: now,
    },
    payment_accounts: [
      {
        id: crypto.randomUUID(),
        method: 'lypay',
        bank_name: 'خدمة LYPay - مصرف الجمهورية / التجاري',
        account_holder: 'شركة تيتر ليبيا للخدمات المالية',
        account_number: '001102003004005',
        iban: 'LY89002001102003004005001',
        phone_or_id: '218910000100',
        instructions: 'يرجى كتابة رقم الطلب في خانة الملاحظات وعدم إرسال مبالغ من حسابات غير مطابقة لاسم المحوّل.',
        is_active: true,
        display_order: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        method: 'onepay',
        bank_name: 'خدمة OnePay - مصرف التجارة والتنمية / الأمان',
        account_holder: 'شركة تيتر ليبيا للخدمات المالية',
        account_number: '22004400660088',
        iban: 'LY44010022004400660088002',
        phone_or_id: '218920000200',
        instructions: 'أرفق لقطة شاشة واضحة لإيصال OnePay تحتوي على الرقم المرجعي وتاريخ العملية.',
        is_active: true,
        display_order: 2,
        created_at: now,
        updated_at: now,
      },
    ],
    platform_wallets: [
      {
        id: crypto.randomUUID(),
        label: 'محفظة الاستقبال الرئيسية (TRON TRC20)',
        network: 'TRC20',
        address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
        qr_code_url: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ],
    orders: [],
    order_status_history: [],
    financial_ledger: [],
    notifications: [],
    notification_templates: buildDefaultTemplates(),
    user_notification_preferences: [],
    push_subscriptions: [],
    site_content: {
      id: 'default',
      logo_url: '/images/brand-icon.png',
      app_name_ar: 'تيتر ليبيا',
      app_name_en: 'Tether Libya',
      tagline_ar: 'آمن .. سريع .. بكل ثقة',
      icon_192_url: '/pwa-192x192.png',
      icon_512_url: '/pwa-512x512.png',
      icon_maskable_url: '/pwa-maskable-512x512.png',
      apple_touch_icon_url: '/apple-touch-icon.png',
      promo_banner_title: 'تيتر ليبيا ..',
      promo_banner_subtitle: 'اختيارك الأفضل',
      promo_banner_image_url: '/images/promo-banner.jpg',
      primary_color: '#10F5A6',
      accent_color: '#0D8BFF',
      support_phone: '+218 91 000 0000',
      support_whatsapp: 'https://wa.me/218910000000',
      support_email: 'support@tetherlibya.ly',
      telegram_url: 'https://t.me/tetherlibya',
      facebook_url: 'https://facebook.com/tetherlibya',
      maintenance_mode: false,
      maintenance_message: 'المنصة تحت الصيانة المجدولة حالياً، سنعود قريباً.',
      public_pages_json: DEFAULT_PUBLIC_PAGES,
      updated_at: now,
    },
    seo_settings: buildDefaultSeo(),
    admin_audit_logs: [],
    support_messages: [],
    admin_credential_hash: null,
    vapid_keys: null,
  };
}

const globalForStore = globalThis as unknown as { __tlLocalStore?: LocalStore };

function readLocalStore(): LocalStore {
  if (globalForStore.__tlLocalStore) {
    return globalForStore.__tlLocalStore;
  }
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw) as LocalStore;
      globalForStore.__tlLocalStore = parsed;
      return parsed;
    }
  } catch {
    // Recreate clean store if corrupted
  }
  const initial = createInitialStore();
  writeLocalStore(initial);
  return initial;
}

function writeLocalStore(store: LocalStore): void {
  globalForStore.__tlLocalStore = store;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch {
    // Fallback to in-memory only if filesystem is read-only
  }
}

export async function ensureWalletQr(wallet: PlatformWallet): Promise<PlatformWallet> {
  if (wallet.qr_code_url) return wallet;
  try {
    const dataUrl = await QRCode.toDataURL(wallet.address, {
      width: 320,
      margin: 2,
      color: { dark: '#050B18', light: '#FFFFFF' },
    });
    return { ...wallet, qr_code_url: dataUrl };
  } catch {
    return wallet;
  }
}

// ============================================================================
// Unified Database Operations (Supabase PostgreSQL Primary + Local Store Fallback)
// ============================================================================

export const db = {
  // --- System / Admin Bootstrap ---
  async getAdminCredentialHash(): Promise<string | null> {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseAdmin()!;
      const { data } = await sb
        .from('site_content')
        .select('public_pages_json')
        .eq('id', 'default')
        .maybeSingle();
      const pages = (data?.public_pages_json || {}) as Record<string, unknown>;
      return (pages.__admin_credential_hash as string) || null;
    }
    return readLocalStore().admin_credential_hash;
  },

  async setAdminCredentialHash(hash: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await this.getSiteContent();
      const sb = getSupabaseAdmin()!;
      const { data } = await sb
        .from('site_content')
        .select('public_pages_json')
        .eq('id', 'default')
        .maybeSingle();
      const pages = {
        ...DEFAULT_PUBLIC_PAGES,
        ...((data?.public_pages_json || {}) as Record<string, unknown>),
        __admin_credential_hash: hash,
      };
      await sb
        .from('site_content')
        .update({ public_pages_json: pages, updated_at: new Date().toISOString() })
        .eq('id', 'default');
      return;
    }
    const store = readLocalStore();
    store.admin_credential_hash = hash;
    writeLocalStore(store);
  },

  async getVapidKeysFromStore(): Promise<{ publicKey: string; privateKey: string } | null> {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseAdmin()!;
      const { data } = await sb
        .from('site_content')
        .select('public_pages_json')
        .eq('id', 'default')
        .maybeSingle();
      const pages = (data?.public_pages_json || {}) as Record<string, unknown>;
      return (pages.__vapid_keys as { publicKey: string; privateKey: string }) || null;
    }
    return readLocalStore().vapid_keys;
  },

  async saveVapidKeysToStore(keys: { publicKey: string; privateKey: string }): Promise<void> {
    if (isSupabaseConfigured()) {
      await this.getSiteContent();
      const sb = getSupabaseAdmin()!;
      const { data } = await sb
        .from('site_content')
        .select('public_pages_json')
        .eq('id', 'default')
        .maybeSingle();
      const pages = {
        ...DEFAULT_PUBLIC_PAGES,
        ...((data?.public_pages_json || {}) as Record<string, unknown>),
        __vapid_keys: keys,
      };
      await sb
        .from('site_content')
        .update({ public_pages_json: pages, updated_at: new Date().toISOString() })
        .eq('id', 'default');
      return;
    }
    const store = readLocalStore();
    store.vapid_keys = keys;
    writeLocalStore(store);
  },

  // --- Users & Auth ---
  async getUserById(id: string): Promise<User | null> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!.from('users').select('*').eq('id', id).maybeSingle();
      return data as User | null;
    }
    return readLocalStore().users.find((u) => u.id === id) || null;
  },

  async getUserByPhone(phone: string): Promise<User | null> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!.from('users').select('*').eq('phone', phone).maybeSingle();
      return data as User | null;
    }
    return readLocalStore().users.find((u) => u.phone === phone) || null;
  },

  async listUsers(searchPhone?: string): Promise<User[]> {
    if (isSupabaseConfigured()) {
      let query = getSupabaseAdmin()!.from('users').select('*').order('created_at', { ascending: false });
      if (searchPhone) {
        query = query.ilike('phone', `%${searchPhone}%`);
      }
      const { data } = await query;
      return (data || []) as User[];
    }
    const users = [...readLocalStore().users].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (searchPhone) {
      return users.filter((u) => u.phone.includes(searchPhone) || u.full_name.includes(searchPhone));
    }
    return users;
  },

  async listNotifiableAdminIds(): Promise<string[]> {
    const ids = new Set<string>([SUPER_ADMIN_ACTOR_ID]);
    const staffList = await this.listAdminStaff();
    for (const s of staffList) {
      if (s.is_active && (s.permissions_json.includes('orders') || s.permissions_json.includes('support'))) {
        ids.add(s.id);
      }
    }
    return Array.from(ids);
  },

  async upsertUserByPhone(phone: string, defaults?: Partial<User>): Promise<User> {
    const existing = await this.getUserByPhone(phone);
    const now = new Date().toISOString();
    if (existing) return existing;
    const newUser: User = {
      id: crypto.randomUUID(),
      phone,
      full_name: defaults?.full_name || 'عميل تيتر ليبيا',
      first_name: defaults?.first_name || null,
      last_name: defaults?.last_name || null,
      city_area: defaults?.city_area || null,
      passport_image_url: defaults?.passport_image_url || null,
      birth_cert_image_url: defaults?.birth_cert_image_url || null,
      kyc_note: defaults?.kyc_note || null,
      terms_accepted_at: defaults?.terms_accepted_at || null,
      onboarding_completed: defaults?.onboarding_completed ?? false,
      last_active_at: now,
      email: defaults?.email || null,
      avatar_url: defaults?.avatar_url || null,
      kyc_status: defaults?.kyc_status || 'unverified',
      role: 'user',
      is_banned: false,
      ban_reason: null,
      total_volume_usdt: 0,
      created_at: now,
      updated_at: now,
    };
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabaseAdmin()!.from('users').insert(newUser).select().single();
      if (error) throw new Error(error.message);
      await getSupabaseAdmin()!
        .from('user_notification_preferences')
        .upsert({
          user_id: newUser.id,
          order_updates: true,
          rate_alerts: true,
          promotions: true,
          admin_alerts: true,
          web_push_enabled: false,
          updated_at: now,
        });
      return data as User;
    }
    const store = readLocalStore();
    store.users.push(newUser);
    store.user_notification_preferences.push({
      user_id: newUser.id,
      order_updates: true,
      rate_alerts: true,
      promotions: true,
      admin_alerts: true,
      web_push_enabled: false,
      updated_at: now,
    });
    writeLocalStore(store);
    return newUser;
  },

  async updateUser(
    id: string,
    patch: Partial<
      Pick<
        User,
        | 'full_name'
        | 'first_name'
        | 'last_name'
        | 'city_area'
        | 'passport_image_url'
        | 'birth_cert_image_url'
        | 'kyc_note'
        | 'terms_accepted_at'
        | 'onboarding_completed'
        | 'last_active_at'
        | 'email'
        | 'avatar_url'
        | 'kyc_status'
        | 'role'
        | 'is_banned'
        | 'ban_reason'
        | 'total_volume_usdt'
      >
    >
  ): Promise<User | null> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('users')
        .update({ ...patch, updated_at: now })
        .eq('id', id)
        .select()
        .maybeSingle();
      return data as User | null;
    }
    const store = readLocalStore();
    const idx = store.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    store.users[idx] = { ...store.users[idx], ...patch, updated_at: now };
    writeLocalStore(store);
    return store.users[idx];
  },

  // --- OTP Sessions ---
  async createOtpSession(session: Omit<OtpSession, 'id' | 'created_at' | 'attempts' | 'verified_at'>): Promise<OtpSession> {
    const record: OtpSession = {
      id: crypto.randomUUID(),
      ...session,
      attempts: 0,
      verified_at: null,
      created_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabaseAdmin()!.from('otp_sessions').insert(record).select().single();
      if (error) throw new Error(error.message);
      return data as OtpSession;
    }
    const store = readLocalStore();
    store.otp_sessions.push(record);
    // Prune older OTP sessions
    if (store.otp_sessions.length > 500) {
      store.otp_sessions = store.otp_sessions.slice(-200);
    }
    writeLocalStore(store);
    return record;
  },

  async getLatestOtpSession(phone: string): Promise<OtpSession | null> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('otp_sessions')
        .select('*')
        .eq('phone', phone)
        .is('verified_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as OtpSession | null;
    }
    const matches = readLocalStore()
      .otp_sessions.filter((s) => s.phone === phone && !s.verified_at)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return matches[0] || null;
  },

  async updateOtpSession(id: string, patch: Partial<Pick<OtpSession, 'attempts' | 'verified_at'>>): Promise<void> {
    if (isSupabaseConfigured()) {
      await getSupabaseAdmin()!.from('otp_sessions').update(patch).eq('id', id);
      return;
    }
    const store = readLocalStore();
    const idx = store.otp_sessions.findIndex((s) => s.id === id);
    if (idx !== -1) {
      store.otp_sessions[idx] = { ...store.otp_sessions[idx], ...patch };
      writeLocalStore(store);
    }
  },

  // --- User Sessions ---
  async createUserSession(session: Omit<UserSession, 'id' | 'created_at' | 'revoked_at'>): Promise<UserSession> {
    const record: UserSession = {
      id: crypto.randomUUID(),
      ...session,
      revoked_at: null,
      created_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabaseAdmin()!.from('user_sessions').insert(record).select().single();
      if (error) throw new Error(error.message);
      return data as UserSession;
    }
    const store = readLocalStore();
    store.user_sessions.push(record);
    writeLocalStore(store);
    return record;
  },

  async getUserSessionByTokenHash(tokenHash: string): Promise<UserSession | null> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('user_sessions')
        .select('*')
        .eq('token_hash', tokenHash)
        .is('revoked_at', null)
        .maybeSingle();
      return data as UserSession | null;
    }
    return (
      readLocalStore().user_sessions.find((s) => s.token_hash === tokenHash && !s.revoked_at) || null
    );
  },

  async extendUserSession(sessionId: string, userId: string, newExpiresAt: string): Promise<void> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      await getSupabaseAdmin()!.from('user_sessions').update({ expires_at: newExpiresAt }).eq('id', sessionId);
      await getSupabaseAdmin()!.from('users').update({ last_active_at: now }).eq('id', userId);
      return;
    }
    const store = readLocalStore();
    const sIdx = store.user_sessions.findIndex((s) => s.id === sessionId);
    if (sIdx !== -1) store.user_sessions[sIdx].expires_at = newExpiresAt;
    const uIdx = store.users.findIndex((u) => u.id === userId);
    if (uIdx !== -1) store.users[uIdx].last_active_at = now;
    writeLocalStore(store);
  },

  async revokeUserSession(tokenHash: string): Promise<void> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      await getSupabaseAdmin()!.from('user_sessions').update({ revoked_at: now }).eq('token_hash', tokenHash);
      return;
    }
    const store = readLocalStore();
    const idx = store.user_sessions.findIndex((s) => s.token_hash === tokenHash);
    if (idx !== -1) {
      store.user_sessions[idx].revoked_at = now;
      writeLocalStore(store);
    }
  },

  async revokeAllUserSessions(userId: string): Promise<void> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      await getSupabaseAdmin()!
        .from('user_sessions')
        .update({ revoked_at: now })
        .eq('user_id', userId)
        .is('revoked_at', null);
      return;
    }
    const store = readLocalStore();
    store.user_sessions = store.user_sessions.map((s) =>
      s.user_id === userId && !s.revoked_at ? { ...s, revoked_at: now } : s
    );
    writeLocalStore(store);
  },

  async hasOrderMatchingFile(userId: string, fileUrl: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('orders')
        .select('id')
        .eq('user_id', userId)
        .or(`receipt_url.eq.${fileUrl},outbound_proof_url.eq.${fileUrl}`)
        .limit(1);
      return Boolean(data && data.length > 0);
    }
    return readLocalStore().orders.some(
      (o) => o.user_id === userId && (o.receipt_url === fileUrl || o.outbound_proof_url === fileUrl)
    );
  },

  // --- Exchange Rates ---
  async getExchangeRates(): Promise<ExchangeRates> {
    if (isSupabaseConfigured()) {
      const sb = getSupabaseAdmin()!;
      const { data } = await sb.from('exchange_rates').select('*').eq('id', 'default').maybeSingle();
      if (data) return data as ExchangeRates;
      const defaults = createInitialStore().exchange_rates;
      await sb.from('exchange_rates').upsert(defaults);
      return defaults;
    }
    return readLocalStore().exchange_rates;
  },

  async updateExchangeRates(patch: Partial<ExchangeRates>): Promise<ExchangeRates> {
    const current = await this.getExchangeRates();
    const updated: ExchangeRates = {
      ...current,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabaseAdmin()!
        .from('exchange_rates')
        .upsert(updated)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as ExchangeRates;
    }
    const store = readLocalStore();
    store.exchange_rates = updated;
    writeLocalStore(store);
    return updated;
  },

  // --- Payment Accounts ---
  async listPaymentAccounts(activeOnly = false): Promise<PaymentAccount[]> {
    if (isSupabaseConfigured()) {
      let query = getSupabaseAdmin()!.from('payment_accounts').select('*').order('display_order', { ascending: true });
      if (activeOnly) query = query.eq('is_active', true);
      const { data } = await query;
      if (data && data.length > 0) return data as PaymentAccount[];
      if (!activeOnly) return [];
      const defaults = createInitialStore().payment_accounts;
      await getSupabaseAdmin()!.from('payment_accounts').upsert(defaults);
      return defaults;
    }
    const all = [...readLocalStore().payment_accounts].sort((a, b) => a.display_order - b.display_order);
    return activeOnly ? all.filter((a) => a.is_active) : all;
  },

  async savePaymentAccount(account: Partial<PaymentAccount> & { method: PaymentAccount['method']; bank_name: string; account_holder: string; account_number: string }): Promise<PaymentAccount> {
    const now = new Date().toISOString();
    if (account.id) {
      if (isSupabaseConfigured()) {
        const { data, error } = await getSupabaseAdmin()!
          .from('payment_accounts')
          .update({ ...account, updated_at: now })
          .eq('id', account.id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data as PaymentAccount;
      }
      const store = readLocalStore();
      const idx = store.payment_accounts.findIndex((a) => a.id === account.id);
      if (idx === -1) throw new Error('Payment account not found');
      store.payment_accounts[idx] = { ...store.payment_accounts[idx], ...account, updated_at: now };
      writeLocalStore(store);
      return store.payment_accounts[idx];
    }
    const created: PaymentAccount = {
      id: crypto.randomUUID(),
      method: account.method,
      bank_name: account.bank_name,
      account_holder: account.account_holder,
      account_number: account.account_number,
      iban: account.iban || null,
      phone_or_id: account.phone_or_id || null,
      instructions: account.instructions || null,
      is_active: account.is_active ?? true,
      display_order: account.display_order ?? 10,
      created_at: now,
      updated_at: now,
    };
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabaseAdmin()!.from('payment_accounts').insert(created).select().single();
      if (error) throw new Error(error.message);
      return data as PaymentAccount;
    }
    const store = readLocalStore();
    store.payment_accounts.push(created);
    writeLocalStore(store);
    return created;
  },

  async deletePaymentAccount(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await getSupabaseAdmin()!.from('payment_accounts').delete().eq('id', id);
      return;
    }
    const store = readLocalStore();
    store.payment_accounts = store.payment_accounts.filter((a) => a.id !== id);
    writeLocalStore(store);
  },

  // --- Platform Wallets ---
  async listPlatformWallets(activeOnly = false): Promise<PlatformWallet[]> {
    let list: PlatformWallet[] = [];
    if (isSupabaseConfigured()) {
      let query = getSupabaseAdmin()!.from('platform_wallets').select('*').order('created_at', { ascending: false });
      if (activeOnly) query = query.eq('is_active', true);
      const { data } = await query;
      if (data && data.length > 0) {
        list = data as PlatformWallet[];
      } else if (activeOnly) {
        const defaults = createInitialStore().platform_wallets;
        await getSupabaseAdmin()!.from('platform_wallets').upsert(defaults);
        list = defaults;
      }
    } else {
      const all = [...readLocalStore().platform_wallets];
      list = activeOnly ? all.filter((w) => w.is_active) : all;
    }
    return Promise.all(list.map(ensureWalletQr));
  },

  async savePlatformWallet(wallet: Partial<PlatformWallet> & { label: string; address: string }): Promise<PlatformWallet> {
    const now = new Date().toISOString();
    let qrCodeUrl = wallet.qr_code_url || null;
    if (!qrCodeUrl) {
      qrCodeUrl = await QRCode.toDataURL(wallet.address, {
        width: 320,
        margin: 2,
        color: { dark: '#050B18', light: '#FFFFFF' },
      });
    }
    if (wallet.id) {
      if (isSupabaseConfigured()) {
        if (wallet.is_active) {
          await getSupabaseAdmin()!.from('platform_wallets').update({ is_active: false }).neq('id', wallet.id);
        }
        const { data, error } = await getSupabaseAdmin()!
          .from('platform_wallets')
          .update({ ...wallet, qr_code_url: qrCodeUrl, network: 'TRC20', updated_at: now })
          .eq('id', wallet.id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data as PlatformWallet;
      }
      const store = readLocalStore();
      if (wallet.is_active) {
        store.platform_wallets = store.platform_wallets.map((w) => ({ ...w, is_active: false }));
      }
      const idx = store.platform_wallets.findIndex((w) => w.id === wallet.id);
      if (idx === -1) throw new Error('Wallet not found');
      store.platform_wallets[idx] = {
        ...store.platform_wallets[idx],
        ...wallet,
        qr_code_url: qrCodeUrl,
        network: 'TRC20',
        updated_at: now,
      };
      writeLocalStore(store);
      return store.platform_wallets[idx];
    }
    const created: PlatformWallet = {
      id: crypto.randomUUID(),
      label: wallet.label,
      network: 'TRC20',
      address: wallet.address,
      qr_code_url: qrCodeUrl,
      is_active: wallet.is_active ?? false,
      created_at: now,
      updated_at: now,
    };
    if (isSupabaseConfigured()) {
      if (created.is_active) {
        await getSupabaseAdmin()!.from('platform_wallets').update({ is_active: false }).neq('id', created.id);
      }
      const { data, error } = await getSupabaseAdmin()!.from('platform_wallets').insert(created).select().single();
      if (error) throw new Error(error.message);
      return data as PlatformWallet;
    }
    const store = readLocalStore();
    if (created.is_active) {
      store.platform_wallets = store.platform_wallets.map((w) => ({ ...w, is_active: false }));
    }
    store.platform_wallets.push(created);
    writeLocalStore(store);
    return created;
  },

  async deletePlatformWallet(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await getSupabaseAdmin()!.from('platform_wallets').delete().eq('id', id);
      return;
    }
    const store = readLocalStore();
    store.platform_wallets = store.platform_wallets.filter((w) => w.id !== id);
    writeLocalStore(store);
  },

  // --- Orders & History ---
  async getOrderById(id: string): Promise<Order | null> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!.from('orders').select('*').eq('id', id).maybeSingle();
      return data as Order | null;
    }
    return readLocalStore().orders.find((o) => o.id === id) || null;
  },

  async getOrderByIdempotencyKey(key: string): Promise<Order | null> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!.from('orders').select('*').eq('idempotency_key', key).maybeSingle();
      return data as Order | null;
    }
    return readLocalStore().orders.find((o) => o.idempotency_key === key) || null;
  },

  async getOrderByTxHash(txHash: string): Promise<Order | null> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!.from('orders').select('*').eq('tx_hash', txHash).maybeSingle();
      return data as Order | null;
    }
    return readLocalStore().orders.find((o) => o.tx_hash === txHash) || null;
  },

  async listOrders(filter?: { userId?: string; status?: OrderStatus; type?: 'buy' | 'sell'; limit?: number }): Promise<Order[]> {
    if (isSupabaseConfigured()) {
      let query = getSupabaseAdmin()!.from('orders').select('*').order('created_at', { ascending: false });
      if (filter?.userId) query = query.eq('user_id', filter.userId);
      if (filter?.status) query = query.eq('status', filter.status);
      if (filter?.type) query = query.eq('type', filter.type);
      if (filter?.limit) query = query.limit(filter.limit);
      const { data } = await query;
      return (data || []) as Order[];
    }
    let list = [...readLocalStore().orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (filter?.userId) list = list.filter((o) => o.user_id === filter.userId);
    if (filter?.status) list = list.filter((o) => o.status === filter.status);
    if (filter?.type) list = list.filter((o) => o.type === filter.type);
    if (filter?.limit) list = list.slice(0, filter.limit);
    return list;
  },

  async createOrder(
    orderInput: Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at'>
  ): Promise<Order> {
    const now = new Date().toISOString();
    const orderNumber = `TL-${Date.now().toString().slice(-6)}-${crypto.randomInt(100, 999)}`;
    const record: Order = {
      ...orderInput,
      id: crypto.randomUUID(),
      order_number: orderNumber,
      created_at: now,
      updated_at: now,
    };
    const historyEntry: OrderStatusHistory = {
      id: crypto.randomUUID(),
      order_id: record.id,
      from_status: null,
      to_status: record.status,
      changed_by: record.user_id,
      note: 'تم إنشاء الطلب وإرساله للمراجعة الإدارية',
      created_at: now,
    };
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabaseAdmin()!.from('orders').insert(record).select().single();
      if (error) throw new Error(error.message);
      await getSupabaseAdmin()!.from('order_status_history').insert(historyEntry);
      return data as Order;
    }
    const store = readLocalStore();
    store.orders.push(record);
    store.order_status_history.push(historyEntry);
    writeLocalStore(store);
    return record;
  },

  async updateOrder(
    id: string,
    patch: Partial<Order>,
    historyNote?: { fromStatus: OrderStatus | null; toStatus: OrderStatus; changedBy: string | null; note: string }
  ): Promise<Order | null> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabaseAdmin()!
        .from('orders')
        .update({ ...patch, updated_at: now })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (data && historyNote) {
        await getSupabaseAdmin()!.from('order_status_history').insert({
          id: crypto.randomUUID(),
          order_id: id,
          from_status: historyNote.fromStatus,
          to_status: historyNote.toStatus,
          changed_by: historyNote.changedBy,
          note: historyNote.note,
          created_at: now,
        });
      }
      return data as Order | null;
    }
    const store = readLocalStore();
    const idx = store.orders.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    store.orders[idx] = { ...store.orders[idx], ...patch, updated_at: now };
    if (historyNote) {
      store.order_status_history.push({
        id: crypto.randomUUID(),
        order_id: id,
        from_status: historyNote.fromStatus,
        to_status: historyNote.toStatus,
        changed_by: historyNote.changedBy,
        note: historyNote.note,
        created_at: now,
      });
    }
    writeLocalStore(store);
    return store.orders[idx];
  },

  async getOrderHistory(orderId: string): Promise<OrderStatusHistory[]> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      return (data || []) as OrderStatusHistory[];
    }
    return readLocalStore()
      .order_status_history.filter((h) => h.order_id === orderId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  // --- Immutable Financial Ledger ---
  async appendLedgerEntries(entries: Array<Omit<LedgerEntry, 'id' | 'created_at'>>): Promise<LedgerEntry[]> {
    const now = new Date().toISOString();
    const rows: LedgerEntry[] = entries.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      created_at: now,
    }));
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabaseAdmin()!.from('financial_ledger').insert(rows).select();
      if (error) throw new Error(error.message);
      return (data || []) as LedgerEntry[];
    }
    const store = readLocalStore();
    store.financial_ledger.push(...rows);
    writeLocalStore(store);
    return rows;
  },

  async listLedgerEntries(limit = 100): Promise<LedgerEntry[]> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('financial_ledger')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      return (data || []) as LedgerEntry[];
    }
    return [...readLocalStore().financial_ledger]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  },

  // --- Notifications, Templates, Preferences & Push ---
  async createNotification(n: Omit<AppNotification, 'id' | 'created_at' | 'is_read' | 'read_at'>): Promise<AppNotification> {
    const record: AppNotification = {
      ...n,
      id: crypto.randomUUID(),
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabaseAdmin()!.from('notifications').insert(record).select().single();
      if (error) throw new Error(error.message);
      return data as AppNotification;
    }
    const store = readLocalStore();
    store.notifications.push(record);
    writeLocalStore(store);
    return record;
  },

  async listUserNotifications(userId: string, limit = 50): Promise<AppNotification[]> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      return (data || []) as AppNotification[];
    }
    return readLocalStore()
      .notifications.filter((n) => n.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  },

  async listAllNotifications(limit = 100): Promise<AppNotification[]> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      return (data || []) as AppNotification[];
    }
    return [...readLocalStore().notifications]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  },

  async markNotificationsRead(userId: string, notificationId?: string): Promise<void> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      let query = getSupabaseAdmin()!.from('notifications').update({ is_read: true, read_at: now }).eq('user_id', userId);
      if (notificationId) query = query.eq('id', notificationId);
      await query;
      return;
    }
    const store = readLocalStore();
    store.notifications = store.notifications.map((n) => {
      if (n.user_id === userId && (!notificationId || n.id === notificationId)) {
        return { ...n, is_read: true, read_at: now };
      }
      return n;
    });
    writeLocalStore(store);
  },

  async listNotificationTemplates(): Promise<NotificationTemplate[]> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!.from('notification_templates').select('*').order('key', { ascending: true });
      if (data && data.length > 0) return data as NotificationTemplate[];
      const defaults = buildDefaultTemplates();
      await getSupabaseAdmin()!.from('notification_templates').upsert(defaults);
      return defaults;
    }
    return readLocalStore().notification_templates;
  },

  async updateNotificationTemplate(
    key: string,
    patch: Partial<Pick<NotificationTemplate, 'title_template' | 'body_template' | 'is_enabled' | 'channel_push' | 'channel_in_app'>>
  ): Promise<NotificationTemplate | null> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('notification_templates')
        .update({ ...patch, updated_at: now })
        .eq('key', key)
        .select()
        .maybeSingle();
      return data as NotificationTemplate | null;
    }
    const store = readLocalStore();
    const idx = store.notification_templates.findIndex((t) => t.key === key);
    if (idx === -1) return null;
    store.notification_templates[idx] = { ...store.notification_templates[idx], ...patch, updated_at: now };
    writeLocalStore(store);
    return store.notification_templates[idx];
  },

  async getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) return data as UserNotificationPreferences;
    } else {
      const found = readLocalStore().user_notification_preferences.find((p) => p.user_id === userId);
      if (found) return found;
    }
    return {
      user_id: userId,
      order_updates: true,
      rate_alerts: true,
      promotions: true,
      admin_alerts: true,
      web_push_enabled: false,
      updated_at: new Date().toISOString(),
    };
  },

  async upsertUserNotificationPreferences(
    userId: string,
    patch: Partial<Omit<UserNotificationPreferences, 'user_id' | 'updated_at'>>
  ): Promise<UserNotificationPreferences> {
    const current = await this.getUserNotificationPreferences(userId);
    const updated: UserNotificationPreferences = {
      ...current,
      ...patch,
      user_id: userId,
      updated_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('user_notification_preferences')
        .upsert(updated, { onConflict: 'user_id' })
        .select()
        .single();
      return (data || updated) as UserNotificationPreferences;
    }
    const store = readLocalStore();
    const idx = store.user_notification_preferences.findIndex((p) => p.user_id === userId);
    if (idx === -1) store.user_notification_preferences.push(updated);
    else store.user_notification_preferences[idx] = updated;
    writeLocalStore(store);
    return updated;
  },

  async savePushSubscription(sub: Omit<PushSubscriptionRecord, 'id' | 'created_at' | 'is_active'>): Promise<PushSubscriptionRecord> {
    const record: PushSubscriptionRecord = {
      ...sub,
      id: crypto.randomUUID(),
      is_active: true,
      created_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabaseAdmin()!
        .from('push_subscriptions')
        .upsert(record, { onConflict: 'endpoint' })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as PushSubscriptionRecord;
    }
    const store = readLocalStore();
    const idx = store.push_subscriptions.findIndex((p) => p.endpoint === sub.endpoint);
    if (idx === -1) store.push_subscriptions.push(record);
    else store.push_subscriptions[idx] = { ...store.push_subscriptions[idx], ...record, is_active: true };
    writeLocalStore(store);
    return record;
  },

  async deactivatePushSubscription(endpoint: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await getSupabaseAdmin()!.from('push_subscriptions').update({ is_active: false }).eq('endpoint', endpoint);
      return;
    }
    const store = readLocalStore();
    store.push_subscriptions = store.push_subscriptions.map((p) =>
      p.endpoint === endpoint ? { ...p, is_active: false } : p
    );
    writeLocalStore(store);
  },

  async listUserPushSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);
      return (data || []) as PushSubscriptionRecord[];
    }
    return readLocalStore().push_subscriptions.filter((p) => p.user_id === userId && p.is_active);
  },

  // --- Site Content & Branding ---
  async getSiteContent(): Promise<SiteContent> {
    const sanitizeContent = (sc: SiteContent): SiteContent => {
      const cleanPages = Object.fromEntries(
        Object.entries(sc.public_pages_json || {}).filter(([k]) => !k.startsWith('__'))
      );
      return {
        ...sc,
        public_pages_json: {
          ...DEFAULT_PUBLIC_PAGES,
          ...cleanPages,
        },
      };
    };
    if (isSupabaseConfigured()) {
      const sb = getSupabaseAdmin()!;
      const { data } = await sb.from('site_content').select('*').eq('id', 'default').maybeSingle();
      if (data) return sanitizeContent(data as SiteContent);
      const defaults = createInitialStore().site_content;
      await sb.from('site_content').upsert(defaults);
      return sanitizeContent(defaults);
    }
    return sanitizeContent(readLocalStore().site_content);
  },

  async updateSiteContent(patch: Partial<SiteContent>): Promise<SiteContent> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      const sb = getSupabaseAdmin()!;
      const { data: rawExisting } = await sb.from('site_content').select('*').eq('id', 'default').maybeSingle();
      const base = (rawExisting as SiteContent | null) || createInitialStore().site_content;
      const existingInternal = Object.fromEntries(
        Object.entries(base.public_pages_json || {}).filter(([k]) => k.startsWith('__'))
      );
      const cleanIncomingPages = patch.public_pages_json
        ? Object.fromEntries(
            Object.entries(patch.public_pages_json).filter(([k]) => !k.startsWith('__'))
          )
        : Object.fromEntries(
            Object.entries(base.public_pages_json || {}).filter(([k]) => !k.startsWith('__'))
          );
      const mergedPages = {
        ...DEFAULT_PUBLIC_PAGES,
        ...cleanIncomingPages,
      };
      const merged = {
        ...base,
        ...patch,
        public_pages_json: {
          ...mergedPages,
          ...existingInternal,
        },
        updated_at: now,
      };
      const { data, error } = await sb.from('site_content').upsert(merged).select().single();
      if (error) throw new Error(error.message);
      return {
        ...(data as SiteContent),
        public_pages_json: mergedPages,
      };
    }
    const store = readLocalStore();
    const cleanIncomingPages = patch.public_pages_json
      ? Object.fromEntries(
          Object.entries(patch.public_pages_json).filter(([k]) => !k.startsWith('__'))
        )
      : store.site_content.public_pages_json;
    const updated: SiteContent = {
      ...store.site_content,
      ...patch,
      public_pages_json: {
        ...DEFAULT_PUBLIC_PAGES,
        ...cleanIncomingPages,
      },
      updated_at: now,
    };
    store.site_content = updated;
    writeLocalStore(store);
    return updated;
  },

  // --- SEO Settings ---
  async listSeoSettings(): Promise<SeoSetting[]> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!.from('seo_settings').select('*').order('page_slug', { ascending: true });
      if (data && data.length > 0) return data as SeoSetting[];
      const defaults = buildDefaultSeo();
      await getSupabaseAdmin()!.from('seo_settings').upsert(defaults);
      return defaults;
    }
    return readLocalStore().seo_settings;
  },

  async getSeoSetting(slug: string): Promise<SeoSetting | null> {
    const list = await this.listSeoSettings();
    return list.find((s) => s.page_slug === slug) || null;
  },

  async upsertSeoSetting(setting: Partial<SeoSetting> & { page_slug: string }): Promise<SeoSetting> {
    const now = new Date().toISOString();
    const existing = await this.getSeoSetting(setting.page_slug);
    const merged: SeoSetting = {
      id: existing?.id || crypto.randomUUID(),
      page_slug: setting.page_slug,
      title: setting.title ?? existing?.title ?? setting.page_slug,
      description: setting.description ?? existing?.description ?? '',
      keywords: setting.keywords ?? existing?.keywords ?? '',
      canonical_url: setting.canonical_url ?? existing?.canonical_url ?? `/${setting.page_slug}`,
      og_title: setting.og_title ?? existing?.og_title ?? setting.title ?? '',
      og_description: setting.og_description ?? existing?.og_description ?? setting.description ?? '',
      og_image_url: setting.og_image_url ?? existing?.og_image_url ?? '/og-image.png',
      noindex: setting.noindex ?? existing?.noindex ?? false,
      schema_type: setting.schema_type ?? existing?.schema_type ?? 'WebPage',
      schema_json: setting.schema_json ?? existing?.schema_json ?? null,
      ga4_measurement_id: setting.ga4_measurement_id ?? existing?.ga4_measurement_id ?? '',
      gsc_verification_code: setting.gsc_verification_code ?? existing?.gsc_verification_code ?? '',
      updated_at: now,
    };
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabaseAdmin()!
        .from('seo_settings')
        .upsert(merged, { onConflict: 'page_slug' })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as SeoSetting;
    }
    const store = readLocalStore();
    const idx = store.seo_settings.findIndex((s) => s.page_slug === setting.page_slug);
    if (idx === -1) store.seo_settings.push(merged);
    else store.seo_settings[idx] = merged;
    writeLocalStore(store);
    return merged;
  },

  // --- Audit Logs ---
  async appendAuditLog(log: Omit<AdminAuditLog, 'id' | 'created_at'>): Promise<void> {
    const record: AdminAuditLog = {
      ...log,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured()) {
      await getSupabaseAdmin()!.from('admin_audit_logs').insert(record);
      return;
    }
    const store = readLocalStore();
    store.admin_audit_logs.push(record);
    writeLocalStore(store);
  },

  async listAuditLogs(limit = 100): Promise<AdminAuditLog[]> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      return (data || []) as AdminAuditLog[];
    }
    return [...readLocalStore().admin_audit_logs]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  },

  // --- Helpers for KPIs (Strictly separated: Customer Personal vs Admin Platform) ---
  async getUserStats(userId: string) {
    const [orders, rates] = await Promise.all([
      this.listOrders({ userId, limit: 500 }),
      this.getExchangeRates(),
    ]);
    const completed = orders.filter((o) => o.status === 'completed');
    const pending = orders.filter((o) =>
      ['pending_review', 'under_review', 'needs_edit', 'approved'].includes(o.status)
    );
    const completedBuys = completed.filter((o) => o.type === 'buy');
    const completedSells = completed.filter((o) => o.type === 'sell');

    return {
      totalOrders: orders.length,
      buyOrders: orders.filter((o) => o.type === 'buy').length,
      sellOrders: orders.filter((o) => o.type === 'sell').length,
      completedOrders: completed.length,
      pendingOrders: pending.length,
      rejectedOrders: orders.filter((o) => o.status === 'rejected').length,
      totalBoughtUsdt: completedBuys.reduce((acc, o) => acc + Number(o.usdt_amount || 0), 0),
      totalSoldUsdt: completedSells.reduce((acc, o) => acc + Number(o.usdt_amount || 0), 0),
      totalLydVolume: completed.reduce((acc, o) => acc + Number(o.lyd_amount || 0), 0),
      buyRate: rates.buy_rate,
      sellRate: rates.sell_rate,
      lastRateUpdate: rates.last_fetched_at,
    };
  },

  async getPlatformStats() {
    const [orders, users, rates] = await Promise.all([
      this.listOrders(),
      this.listUsers(),
      this.getExchangeRates(),
    ]);
    const completed = orders.filter((o) => o.status === 'completed');
    const totalUsdt = completed.reduce((acc, o) => acc + Number(o.usdt_amount || 0), 0);
    const totalLyd = completed.reduce((acc, o) => acc + Number(o.lyd_amount || 0), 0);
    return {
      totalUsers: users.length,
      totalOrders: orders.length,
      completedOrders: completed.length,
      pendingOrders: orders.filter((o) => o.status === 'pending_review' || o.status === 'under_review').length,
      totalUsdtVolume: totalUsdt,
      totalLydVolume: totalLyd,
      buyRate: rates.buy_rate,
      sellRate: rates.sell_rate,
      lastRateUpdate: rates.last_fetched_at,
    };
  },

  // --- Support Messages ---
  async createSupportMessage(input: {
    name: string;
    phone: string;
    subject: string;
    message: string;
  }): Promise<SupportMessage> {
    const now = new Date().toISOString();
    const record: SupportMessage = {
      id: crypto.randomUUID(),
      name: input.name,
      phone: input.phone,
      subject: input.subject,
      message: input.message,
      status: 'open',
      admin_reply_note: null,
      created_at: now,
      updated_at: now,
    };
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabaseAdmin()!
        .from('support_messages')
        .insert(record)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as SupportMessage;
    }
    const store = readLocalStore();
    if (!store.support_messages) store.support_messages = [];
    store.support_messages.push(record);
    writeLocalStore(store);
    return record;
  },

  async listSupportMessages(limit = 100): Promise<SupportMessage[]> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('support_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      return (data || []) as SupportMessage[];
    }
    const store = readLocalStore();
    return [...(store.support_messages || [])]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  },

  async updateSupportMessage(
    id: string,
    patch: { status?: SupportMessage['status']; admin_reply_note?: string | null }
  ): Promise<SupportMessage | null> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('support_messages')
        .update({ ...patch, updated_at: now })
        .eq('id', id)
        .select()
        .single();
      return (data as SupportMessage) || null;
    }
    const store = readLocalStore();
    if (!store.support_messages) store.support_messages = [];
    const idx = store.support_messages.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    store.support_messages[idx] = {
      ...store.support_messages[idx],
      ...patch,
      updated_at: now,
    };
    writeLocalStore(store);
    return store.support_messages[idx];
  },

  // --- Isolated Staff Accounts & Admin Sessions ---
  async listAdminStaff(): Promise<AdminStaff[]> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('admin_staff')
        .select('*')
        .order('created_at', { ascending: false });
      return (data || []) as AdminStaff[];
    }
    return [...(readLocalStore().admin_staff || [])].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );
  },

  async getAdminStaffById(id: string): Promise<AdminStaff | null> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('admin_staff')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      return data as AdminStaff | null;
    }
    return (readLocalStore().admin_staff || []).find((s) => s.id === id) || null;
  },

  async getAdminStaffByUsername(username: string): Promise<AdminStaff | null> {
    const clean = username.trim().toLowerCase();
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('admin_staff')
        .select('*')
        .eq('username', clean)
        .maybeSingle();
      return data as AdminStaff | null;
    }
    return (readLocalStore().admin_staff || []).find((s) => s.username.toLowerCase() === clean) || null;
  },

  async createAdminStaff(input: {
    full_name: string;
    username: string;
    password_hash: string;
    role: StaffRole;
    permissions_json: AdminPermission[];
  }): Promise<AdminStaff> {
    const now = new Date().toISOString();
    const record: AdminStaff = {
      id: crypto.randomUUID(),
      full_name: input.full_name.trim(),
      username: input.username.trim().toLowerCase(),
      password_hash: input.password_hash,
      role: input.role,
      permissions_json: input.permissions_json.filter((p) => p !== 'staff'),
      is_active: true,
      last_login_at: null,
      created_at: now,
      updated_at: now,
    };
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabaseAdmin()!
        .from('admin_staff')
        .insert(record)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as AdminStaff;
    }
    const store = readLocalStore();
    if (!store.admin_staff) store.admin_staff = [];
    store.admin_staff.push(record);
    writeLocalStore(store);
    return record;
  },

  async updateAdminStaff(
    id: string,
    patch: Partial<Pick<AdminStaff, 'full_name' | 'password_hash' | 'role' | 'permissions_json' | 'is_active' | 'last_login_at'>>
  ): Promise<AdminStaff | null> {
    const now = new Date().toISOString();
    const safePatch = {
      ...patch,
      ...(patch.permissions_json
        ? { permissions_json: patch.permissions_json.filter((p) => p !== 'staff') }
        : {}),
      updated_at: now,
    };
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('admin_staff')
        .update(safePatch)
        .eq('id', id)
        .select()
        .maybeSingle();
      return data as AdminStaff | null;
    }
    const store = readLocalStore();
    if (!store.admin_staff) store.admin_staff = [];
    const idx = store.admin_staff.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    store.admin_staff[idx] = { ...store.admin_staff[idx], ...safePatch };
    writeLocalStore(store);
    return store.admin_staff[idx];
  },

  async deleteAdminStaff(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await getSupabaseAdmin()!.from('admin_staff').delete().eq('id', id);
      return;
    }
    const store = readLocalStore();
    store.admin_staff = (store.admin_staff || []).filter((s) => s.id !== id);
    store.admin_sessions = (store.admin_sessions || []).filter((sess) => sess.staff_id !== id);
    writeLocalStore(store);
  },

  async createAdminSession(
    session: Omit<AdminSession, 'id' | 'created_at' | 'revoked_at'>
  ): Promise<AdminSession> {
    const record: AdminSession = {
      id: crypto.randomUUID(),
      ...session,
      revoked_at: null,
      created_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabaseAdmin()!
        .from('admin_sessions')
        .insert(record)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as AdminSession;
    }
    const store = readLocalStore();
    if (!store.admin_sessions) store.admin_sessions = [];
    store.admin_sessions.push(record);
    writeLocalStore(store);
    return record;
  },

  async getAdminSessionByTokenHash(tokenHash: string): Promise<AdminSession | null> {
    if (isSupabaseConfigured()) {
      const { data } = await getSupabaseAdmin()!
        .from('admin_sessions')
        .select('*')
        .eq('token_hash', tokenHash)
        .is('revoked_at', null)
        .maybeSingle();
      return data as AdminSession | null;
    }
    return (
      (readLocalStore().admin_sessions || []).find(
        (s) => s.token_hash === tokenHash && !s.revoked_at
      ) || null
    );
  },

  async revokeAdminSession(tokenHash: string): Promise<void> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      await getSupabaseAdmin()!
        .from('admin_sessions')
        .update({ revoked_at: now })
        .eq('token_hash', tokenHash);
      return;
    }
    const store = readLocalStore();
    if (!store.admin_sessions) return;
    store.admin_sessions = store.admin_sessions.map((s) =>
      s.token_hash === tokenHash ? { ...s, revoked_at: now } : s
    );
    writeLocalStore(store);
  },

  async revokeStaffSessions(staffId: string): Promise<void> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured()) {
      await getSupabaseAdmin()!
        .from('admin_sessions')
        .update({ revoked_at: now })
        .eq('staff_id', staffId)
        .is('revoked_at', null);
      return;
    }
    const store = readLocalStore();
    if (!store.admin_sessions) return;
    store.admin_sessions = store.admin_sessions.map((s) =>
      s.staff_id === staffId && !s.revoked_at ? { ...s, revoked_at: now } : s
    );
    writeLocalStore(store);
  },
};

export type { KycStatus, UserRole };
