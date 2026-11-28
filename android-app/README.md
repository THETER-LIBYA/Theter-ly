# Tether Libya — Android TWA App (`ly.tetherly.app`)

تطبيق Android مستقل مبني بتقنية **Trusted Web Activity (TWA)** عبر **Bubblewrap** وموجّه مباشرة إلى النطاق الرسمي:
`https://www.tether-ly.ly/`

## البيانات الأساسية للتطبيق
- **معرّف الحزمة (Package ID):** `ly.tetherly.app`
- **اسم التطبيق:** تيتر ليبيا | Tether Libya
- **اسم الأيقونة (Launcher):** تيتر ليبيا
- **الإصدار:** `1.0.0` (`versionCode: 1`)
- **الحد الأدنى لنظام Android:** Android 5.0 (API 21)
- **لون الشريط والـ Splash:** `#050B18`
- **توجيه الإشعارات (Notification Delegation):** مفعّل

## ملفات الإخراج والنسخة النهائية
- **`app-release-signed.apk`**: نسخة APK Release موقّعة رقمياً ومضبوطة (`zipalign` + `apksigner`) وجاهزة للتثبيت المباشر على هواتف Android أو النشر على **APKPure**.
- **`app-release-bundle.aab`**: نسخة App Bundle موقّعة (للنشر على Google Play لاحقاً إذا رغبت).

## مفاتيح التوقيع (خارج GitHub)
- مسار مفتاح التوقيع: `android-app/signing/tether-ly-release.jks`
- بيانات الاعتماد: `android-app/signing/keystore.properties`
- Alias: `tetherly`
- **SHA-256 Fingerprint:**
  `BF:9B:E8:68:7E:F9:1B:63:8E:31:8A:31:5C:B2:59:24:F5:C3:EE:FF:E3:C7:8A:FB:BC:F6:34:13:E7:6F:2D:47`
- جميع ملفات التوقيع (`signing/`, `*.jks`, `*.keystore`, `keystore.properties`) محظورة من الرفع عبر `android-app/.gitignore`. يُنصح بأخذ نسخة احتياطية آمنة من مجلد `signing/` خارج المشروع وعدم رفعه لأي مستودع عام.

## تفعيل وضع ملء الشاشة (Digital Asset Links)
الملف `android-app/assetlinks.json` جاهز ومطابق لمعرّف الحزمة `ly.tetherly.app` وبصمة `SHA-256` أعلاه.
لإخفاء شريط المتصفح العلوي وتشغيل التطبيق بملء الشاشة بالكامل:
- ارفع محتوى `android-app/assetlinks.json` إلى المسار العام للموقع:
  `https://www.tether-ly.ly/.well-known/assetlinks.json`
  مع نوع محتوى `application/json` واستجابة HTTP `200`.
