import { salesSummary, sampleOrders, serviceCatalog } from '@/lib/mock-data';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    services: serviceCatalog.filter((item) => item.type === 'service'),
    products: serviceCatalog.filter((item) => item.type === 'product'),
  });
}
