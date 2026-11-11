import { prisma } from '@/lib/prisma';
import { isAdminRequest, unauthorized } from '@/lib/admin-auth';
import { NextResponse } from 'next/server';
import { randomInt, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
const actionSchema = z.object({ action: z.enum(['mark-ready', 'verify-pickup']), orderId: z.string().min(1), otp: z.string().regex(/^[0-9]{6}$/).optional() });
const hashOtp = (otp: string, salt: string) => `${salt}:${scryptSync(otp, salt, 64).toString('hex')}`;

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: 'Invalid order action.' }, { status: 400 });
  const { action, orderId, otp } = parsed.data;

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
    if (action === 'mark-ready') {
      if (['COLLECTED', 'CANCELLED', 'REFUNDED'].includes(order.status)) return NextResponse.json({ message: 'This order cannot be marked ready.' }, { status: 409 });
      const code = String(randomInt(100000, 1000000));
      const salt = randomBytes(16).toString('hex');
      const updated = await prisma.order.update({ where: { id: orderId }, data: { status: 'READY_FOR_PICKUP', pickupOtpHash: hashOtp(code, salt), pickupOtpExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), pickupOtpAttempts: 0 } });
      return NextResponse.json({ ok: true, order: { id: updated.id, orderNumber: updated.orderNumber, status: updated.status }, ...(process.env.NODE_ENV !== 'production' ? { demoPickupCode: code } : {}) });
    }
    if (order.status !== 'READY_FOR_PICKUP' || order.collectedAt) return NextResponse.json({ message: 'This order is not awaiting collection.' }, { status: 409 });
    if (!otp || !order.pickupOtpHash || !order.pickupOtpExpiresAt || order.pickupOtpExpiresAt < new Date()) return NextResponse.json({ message: 'Collection code is missing or expired.' }, { status: 400 });
    if (order.pickupOtpAttempts >= 5) return NextResponse.json({ message: 'Too many incorrect attempts. Regenerate the pickup code.' }, { status: 429 });
    const [salt, expectedHex] = order.pickupOtpHash.split(':');
    const actual = scryptSync(otp, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      await prisma.order.update({ where: { id: orderId }, data: { pickupOtpAttempts: { increment: 1 } } });
      return NextResponse.json({ message: 'Incorrect collection code.' }, { status: 400 });
    }
    const updated = await prisma.order.update({ where: { id: orderId, status: 'READY_FOR_PICKUP', collectedAt: null }, data: { status: 'COLLECTED', collectedAt: new Date(), pickupOtpHash: null, pickupOtpExpiresAt: null }, select: { id: true, orderNumber: true, status: true, collectedAt: true } });
    return NextResponse.json({ ok: true, order: updated });
  } catch (error) {
    console.error('Admin order action failed', error);
    return NextResponse.json({ message: 'Could not update the order.' }, { status: 503 });
  }
}
