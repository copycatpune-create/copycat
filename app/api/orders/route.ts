import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

export const dynamic = 'force-dynamic';

const orderSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().regex(/^\+?[0-9]{10,15}$/),
  paymentMode: z.enum(['UPI', 'CARD', 'NET_BANKING', 'CASH_AT_SHOP']),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(z.object({ id: z.string().min(1), type: z.enum(['service', 'product']), quantity: z.number().int().min(1).max(100) })).min(1).max(30),
});

export async function POST(request: Request) {
  const parsed = orderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Check the customer details and cart items.' }, { status: 400 });

  const { customerName, customerPhone, paymentMode, notes, items } = parsed.data;
  try {
    const serviceIds = items.filter((item) => item.type === 'service').map((item) => item.id);
    const productIds = items.filter((item) => item.type === 'product').map((item) => item.id);
    const [services, products] = await Promise.all([
      serviceIds.length ? prisma.service.findMany({ where: { id: { in: serviceIds }, active: true } }) : [],
      productIds.length ? prisma.product.findMany({ where: { id: { in: productIds }, available: true } }) : [],
    ]);
    const serviceById = new Map(services.map((item) => [item.id, item]));
    const productById = new Map(products.map((item) => [item.id, item]));
    for (const item of items) {
      if (item.type === 'service' && !serviceById.has(item.id)) return NextResponse.json({ ok: false, message: 'A selected print service is no longer available.' }, { status: 409 });
      if (item.type === 'product') {
        const product = productById.get(item.id);
        if (!product || product.stock < item.quantity) return NextResponse.json({ ok: false, message: 'A selected stationery item is unavailable or has insufficient stock.' }, { status: 409 });
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      for (const item of items.filter((entry) => entry.type === 'product')) {
        const result = await tx.product.updateMany({ where: { id: item.id, available: true, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
        if (result.count !== 1) throw new Error('STOCK_CHANGED');
      }
      const customer = await tx.user.upsert({ where: { phone: customerPhone }, update: { name: customerName }, create: { phone: customerPhone, name: customerName, role: 'CUSTOMER' } });
      const orderItems = items.map((item) => {
        const price = item.type === 'service' ? serviceById.get(item.id)!.price : productById.get(item.id)!.price;
        return { itemType: item.type === 'service' ? 'SERVICE' as const : 'PRODUCT' as const, quantity: item.quantity, unitPrice: price, lineTotal: Math.round(price * item.quantity * 100) / 100, serviceId: item.type === 'service' ? item.id : null, productId: item.type === 'product' ? item.id : null };
      });
      const total = Math.round(orderItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
      const payment = paymentMode === 'CASH_AT_SHOP' ? { provider: 'CASH_AT_SHOP', status: 'PENDING' as const } : { provider: 'RAZORPAY_NOT_CONFIGURED', status: 'PENDING' as const };
      return tx.order.create({
        data: {
          orderNumber: `CC-${randomUUID().slice(0, 8).toUpperCase()}`,
          customerId: customer.id,
          status: 'PENDING_PAYMENT',
          paymentStatus: 'PENDING',
          total,
          notes,
          items: { create: orderItems },
          payments: { create: { provider: payment.provider, method: paymentMode, status: payment.status, amount: total } },
        },
        select: { id: true, orderNumber: true, status: true, paymentStatus: true, total: true, createdAt: true },
      });
    });
    return NextResponse.json({ ok: true, order, message: paymentMode === 'CASH_AT_SHOP' ? 'Order saved. Payment is due at the shop.' : 'Order saved, but online payment is not configured; payment is still pending.' }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'STOCK_CHANGED') return NextResponse.json({ ok: false, message: 'Stock changed while checking out. Please refresh your cart.' }, { status: 409 });
    console.error('Order creation failed', error);
    return NextResponse.json({ ok: false, message: 'Could not create the order. Please try again.' }, { status: 503 });
  }
}
