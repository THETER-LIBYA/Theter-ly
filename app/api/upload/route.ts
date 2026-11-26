import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getSessionUser, isAdminAuthenticated } from '@/lib/auth';
import { validateFileMagicBytes, verifyOrigin } from '@/lib/security';
import { getWritableDataDir } from '@/lib/storage';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
]);

async function persistUploadAsset(
  folder: string,
  relativePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (isSupabaseConfigured()) {
    const sb = getSupabaseAdmin()!;
    const firstTry = await sb.storage.from(folder).upload(relativePath, buffer, {
      contentType,
      upsert: true,
    });
    if (!firstTry.error) {
      return `/api/files/${folder}/${relativePath}`;
    }

    // Ensure bucket exists on fresh Supabase projects, then retry once
    await sb.storage
      .createBucket(folder, { public: folder === 'branding' })
      .catch(() => null);

    const retry = await sb.storage.from(folder).upload(relativePath, buffer, {
      contentType,
      upsert: true,
    });
    if (!retry.error) {
      return `/api/files/${folder}/${relativePath}`;
    }
  }

  const baseDir = path.resolve(getWritableDataDir(), 'uploads', folder);
  const targetPath = path.resolve(baseDir, relativePath);
  if (!targetPath.startsWith(baseDir + path.sep)) {
    throw new Error('مسار غير صالح');
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, buffer);
  return `/api/files/${folder}/${relativePath}`;
}

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
    const stamp = Date.now();
    const fileName = `${stamp}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const ownerDir = user?.id || 'admin';
    const relativePath = `${ownerDir}/${fileName}`;

    let generatedIcons: Record<string, string> | undefined;
    if (folder === 'branding' && formData.get('generatePwaIcons') === '1' && file.type !== 'application/pdf') {
      const [brandBuf, icon192Buf, icon512Buf, appleTouchBuf, inner384Buf] = await Promise.all([
        sharp(buffer).resize(256, 256, { fit: 'cover' }).png().toBuffer(),
        sharp(buffer).resize(192, 192, { fit: 'cover' }).png().toBuffer(),
        sharp(buffer).resize(512, 512, { fit: 'cover' }).png().toBuffer(),
        sharp(buffer).resize(180, 180, { fit: 'cover' }).png().toBuffer(),
        sharp(buffer).resize(384, 384, { fit: 'cover' }).png().toBuffer(),
      ]);

      const maskable512Buf = await sharp({
        create: { width: 512, height: 512, channels: 4, background: { r: 5, g: 11, b: 24, alpha: 1 } },
      })
        .composite([{ input: inner384Buf, gravity: 'center' }])
        .png()
        .toBuffer();

      const [logoUrl, icon192Url, icon512Url, maskableUrl, appleUrl] = await Promise.all([
        persistUploadAsset('branding', `pwa/${stamp}-brand-icon.png`, brandBuf, 'image/png'),
        persistUploadAsset('branding', `pwa/${stamp}-pwa-192.png`, icon192Buf, 'image/png'),
        persistUploadAsset('branding', `pwa/${stamp}-pwa-512.png`, icon512Buf, 'image/png'),
        persistUploadAsset('branding', `pwa/${stamp}-pwa-maskable-512.png`, maskable512Buf, 'image/png'),
        persistUploadAsset('branding', `pwa/${stamp}-apple-touch-icon.png`, appleTouchBuf, 'image/png'),
      ]);

      generatedIcons = {
        logo_url: logoUrl,
        icon_192_url: icon192Url,
        icon_512_url: icon512Url,
        icon_maskable_url: maskableUrl,
        apple_touch_icon_url: appleUrl,
      };
    }

    const url = await persistUploadAsset(folder, relativePath, buffer, file.type);

    return NextResponse.json({
      ok: true,
      url,
      generatedIcons,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'فشل رفع الملف' },
      { status: 500 }
    );
  }
}
