import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const check = await requireAdminPermission(req, 'audit');
  if (!check.ok) return check.response;

  const [auditLogs, ledgerEntries] = await Promise.all([
    db.listAuditLogs(150),
    db.listLedgerEntries(150),
  ]);

  return NextResponse.json({ auditLogs, ledgerEntries });
}
