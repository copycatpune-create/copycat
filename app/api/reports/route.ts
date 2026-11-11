import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { isAdminRequest, unauthorized } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [todayPayments, pendingPayments, ordersToday, readyPickup, orders] = await Promise.all([
      prisma.payment.aggregate({ where: { status: 'SUCCESS', paidAt: { gte: start } }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
      prisma.order.count({ where: { createdAt: { gte: start } } }),
      prisma.order.count({ where: { status: 'READY_FOR_PICKUP' } }),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, orderNumber: true, status: true, paymentStatus: true, total: true, createdAt: true, customer: { select: { name: true, phone: true } } } }),
    ]);
    return NextResponse.json({ summary: { totalSales: todayPayments._sum.amount ?? 0, ordersToday, readyPickup, pendingPayments: pendingPayments._sum.amount ?? 0 }, orders });
  } catch (error) {
    console.error('Admin report query failed', error);
    return NextResponse.json({ message: 'Reports are temporarily unavailable.' }, { status: 503 });
  }
}
