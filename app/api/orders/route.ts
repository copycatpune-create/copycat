import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const payload = await request.json();

  const items = Array.isArray(payload.items) ? payload.items : [];
  const total = items.reduce((sum: number, item: any) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);

  const order = {
    id: `ord-${Date.now()}`,
    orderNumber: `CC-${Date.now()}`,
    status: payload.paymentMode === 'CASH_AT_SHOP' ? 'PENDING_PAYMENT' : 'PAYMENT_SUCCESSFUL',
    paymentStatus: payload.paymentMode === 'CASH_AT_SHOP' ? 'PENDING' : 'SUCCESS',
    total,
  };

  return NextResponse.json({ ok: true, order });
}
