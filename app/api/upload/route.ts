import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getSessionUser, isAdminAuthenticated } from '@/lib/auth';
import { validateFileMagicBytes, verifyOrigin } from '@/lib/security';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
]);

export async function POST(req: NextRequest) {
  if (!verifyOrigin(req)) {
    return NextResponse.json({ error: 'طلب غير مصرح به' }, { status: 403 });
  }

  const user = await getSessionUser(req);
  const admin = await isAdminAuthenticated(req);

  if (!user && !admin.authorized) {
    return NextResponse.json({ error: 'يرجى تسجيل الدخول لرفع الملفات' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const folderRaw = String(formData.get('folder') || 'receipts');
    const folder = ['receipts', 'proofs', 'branding', 'kyc'].includes(folderRaw)
      ? folderRaw
      : 'receipts';

    if ((folder === 'proofs' || folder === 'branding') && !admin.authorized) {
      return NextResponse.json({ error: 'غير مصرح برفع ملفات في هذا المجلد' }, { status: 403 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'لم يتم إرفاق ملف صالح' }, { status: 400 });
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: 'صيغة الملف غير مدعومة. الصيغ المسموحة: PNG, JPG, WEBP, PDF' },
        { status: 400 }
      );
    }

    if (folder === 'kyc' && file.type === 'application/pdf') {
      return NextResponse.json(
        { error: 'يرجى رفع صورة واضحة للمستند (PNG أو JPG أو WEBP)' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: 'حجم الملف يتجاوز الحد الأقصى (5 ميجابايت)' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateFileMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: 'محتوى الملف لا يطابق الصيغة المصرح بها' },
        { status: 400 }
      );
    }

    const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1].replace('jpeg', 'jpg');
    const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const ownerDir = user?.id || 'admin';
    const relativePath = `${ownerDir}/${fileName}`;

    let generatedIcons: Record<string, string> | undefined;
    if (folder === 'branding' && formData.get('generatePwaIcons') === '1' && file.type !== 'application/pdf') {
      const publicDir = path.resolve(process.cwd(), 'public');
      const customLogoPath = path.join(publicDir, 'images', 'brand-icon-custom.png');
      fs.mkdirSync(path.dirname(customLogoPath), { recursive: true });

      await sharp(buffer).resize(256, 256, { fit: 'cover' }).png().toFile(customLogoPath);
      await sharp(buffer).resize(192, 192, { fit: 'cover' }).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
      await sharp(buffer).resize(512, 512, { fit: 'cover' }).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
      await sharp(buffer).resize(180, 180, { fit: 'cover' }).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));

      const inner = await sharp(buffer).resize(384, 384, { fit: 'cover' }).png().toBuffer();
      await sharp({
        create: { width: 512, height: 512, channels: 4, background: { r: 5, g: 11, b: 24, alpha: 1 } },
      })
        .composite([{ input: inner, gravity: 'center' }])
        .png()
        .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

      generatedIcons = {
        logo_url: '/images/brand-icon-custom.png?v=' + Date.now(),
        icon_192_url: '/pwa-192x192.png?v=' + Date.now(),
        icon_512_url: '/pwa-512x512.png?v=' + Date.now(),
        icon_maskable_url: '/pwa-maskable-512x512.png?v=' + Date.now(),
        apple_touch_icon_url: '/apple-touch-icon.png?v=' + Date.now(),
      };
    }

    if (isSupabaseConfigured()) {
      const sb = getSupabaseAdmin()!;
      const { error } = await sb.storage.from(folder).upload(relativePath, buffer, {
        contentType: file.type,
        upsert: false,
      });
      if (!error) {
        if (folder === 'branding') {
          const { data } = sb.storage.from(folder).getPublicUrl(relativePath);
          return NextResponse.json({ ok: true, url: data.publicUrl, generatedIcons });
        }
        return NextResponse.json({
          ok: true,
          url: `/api/files/${folder}/${relativePath}`,
          generatedIcons,
        });
      }
    }

    const baseDir = path.resolve(process.cwd(), '.data', 'uploads', folder);
    const targetPath = path.resolve(baseDir, relativePath);
    if (!targetPath.startsWith(baseDir + path.sep)) {
      return NextResponse.json({ error: 'مسار غير صالح' }, { status: 400 });
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, buffer);

    return NextResponse.json({
      ok: true,
      url: `/api/files/${folder}/${relativePath}`,
      generatedIcons,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'فشل رفع الملف' },
      { status: 500 }
    );
  }
}
