import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [services, products] = await Promise.all([
      prisma.service.findMany({ where: { active: true }, include: { category: true }, orderBy: { name: 'asc' } }),
      prisma.product.findMany({ where: { available: true, stock: { gt: 0 } }, include: { category: true }, orderBy: { name: 'asc' } }),
    ]);
    return NextResponse.json({
      services: services.map((item) => ({ id: item.id, name: item.name, type: 'service', category: item.category?.name ?? 'Printing', price: item.price, description: item.description })),
      products: products.map((item) => ({ id: item.id, name: item.name, type: 'product', category: item.category?.name ?? 'Stationery', price: item.price, description: item.description, stock: item.stock, imageUrl: item.imageUrl })),
    });
  } catch (error) {
    console.error('Catalog query failed', error);
    return NextResponse.json({ message: 'Catalog is temporarily unavailable.' }, { status: 503 });
  }
}
