import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

export function isAdminRequest(request: Request) {
  const expected = process.env.ADMIN_API_KEY;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function unauthorized() {
  return NextResponse.json({ message: 'Owner authorization required.' }, { status: 401 });
}
