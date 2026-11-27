import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isAdminAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';
import { getWritableDataDir } from '@/lib/storage';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

const MIME_MAP: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await context.params;
  if (!segments || segments.length < 2) {
    return NextResponse.json({ error: 'ملف غير موجود' }, { status: 404 });
  }

  const folder = segments[0];
  if (!['receipts', 'proofs', 'branding', 'kyc'].includes(folder)) {
    return NextResponse.json({ error: 'مسار غير مسموح' }, { status: 403 });
  }

  if (folder !== 'branding') {
    const user = await getSessionUser(req);
    const admin = await isAdminAuthenticated(req);
    const adminCanViewFolder =
      admin.authorized &&
      ((folder === 'kyc' && admin.permissions.includes('users')) ||
        ((folder === 'receipts' || folder === 'proofs') &&
          (admin.permissions.includes('orders') || admin.permissions.includes('audit'))));

    if (!user && !adminCanViewFolder) {
      return NextResponse.json({ error: 'غير مصرح بالوصول للمستند' }, { status: admin.authenticated ? 403 : 401 });
    }

    if (!adminCanViewFolder && user) {
      const requestedUrl = `/api/files/${segments.join('/')}`;
      const ownerPrefixMatch = segments.length >= 3 && segments[1] === user.id;
      const isUserKycDoc =
        folder === 'kyc' &&
        (user.passport_image_url === requestedUrl || user.birth_cert_image_url === requestedUrl);
      const isUserOrderDoc =
        (folder === 'receipts' || folder === 'proofs') &&
        (await db.hasOrderMatchingFile(user.id, requestedUrl));

      if (!ownerPrefixMatch && !isUserKycDoc && !isUserOrderDoc) {
        return NextResponse.json({ error: 'غير مصرح لك بعرض هذا المستند' }, { status: 403 });
      }
    }
  }

  const commonHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': folder === 'branding' ? 'public, max-age=86400' : 'private, no-store',
  };

  if (isSupabaseConfigured()) {
    const storagePath = segments.slice(1).join('/');
    const { data, error } = await getSupabaseAdmin()!.storage.from(folder).download(storagePath);
    if (!error && data) {
      const arrayBuffer = await data.arrayBuffer();
      const ext = storagePath.split('.').pop()?.toLowerCase() || 'png';
      return new NextResponse(arrayBuffer, {
        headers: {
          ...commonHeaders,
          'Content-Disposition': 'inline',
          'Content-Type': MIME_MAP[ext] || 'application/octet-stream',
        },
      });
    }
  }

  const baseDir = path.resolve(getWritableDataDir(), 'uploads', folder);
  const fileName = segments.slice(1).join('/');
  const resolved = path.resolve(baseDir, fileName);

  if (!resolved.startsWith(baseDir + path.sep) || !fs.existsSync(resolved)) {
    return NextResponse.json({ error: 'الملف غير موجود' }, { status: 404 });
  }

  const buffer = fs.readFileSync(resolved);
  const ext = resolved.split('.').pop()?.toLowerCase() || 'png';
  return new NextResponse(buffer, {
    headers: {
      ...commonHeaders,
      'Content-Disposition': 'inline',
      'Content-Type': MIME_MAP[ext] || 'application/octet-stream',
    },
  });
}
