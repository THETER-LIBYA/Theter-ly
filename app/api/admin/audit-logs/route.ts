import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const admin = await isAdminAuthenticated(req);
  if (!admin.authorized) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  }

  const [auditLogs, ledgerEntries] = await Promise.all([
    db.listAuditLogs(150),
    db.listLedgerEntries(150),
  ]);

  return NextResponse.json({ auditLogs, ledgerEntries });
}
