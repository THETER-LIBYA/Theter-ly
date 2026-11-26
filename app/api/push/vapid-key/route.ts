import { NextResponse } from 'next/server';
import { getVapidKeys } from '@/lib/push';

export async function GET() {
  const { publicKey } = await getVapidKeys();
  return NextResponse.json({ publicKey });
}
