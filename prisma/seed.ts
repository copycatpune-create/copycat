import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const categories = [
  { name: "Document Printing", slug: "document-printing" }, { name: "Xerox Services", slug: "xerox-services" },
  { name: "Binding Services", slug: "binding-services" }, { name: "Stationery", slug: "stationery" },
];
async function main() {
  for (const category of categories) await prisma.category.upsert({ where: { slug: category.slug }, update: {}, create: category });
  const cats = Object.fromEntries((await prisma.category.findMany()).map(c => [c.slug, c.id]));
  const services = [
    ["Black & White Printing", "A4 document printing, per page", 2, "document-printing"], ["Colour Printing", "Colour document printing, per page", 8, "document-printing"],
    ["A3 Printing", "Large format A3 print, per page", 15, "document-printing"], ["Black & White Xerox", "Black and white photocopy, per page", 2, "xerox-services"],
    ["Colour Xerox", "Colour photocopy, per page", 10, "xerox-services"], ["Spiral Binding", "Spiral binding and finishing", 40, "binding-services"],
    ["Lamination", "Document lamination", 20, "binding-services"], ["Scanning", "Document scanning", 5, "document-printing"],
  ] as const;
  for (const [name, description, price, slug] of services) await prisma.service.upsert({ where: { id: name }, update: {}, create: { name, description, price, categoryId: cats[slug] } }).catch(async () => { const found = await prisma.service.findFirst({ where: { name } }); if (!found) await prisma.service.create({ data: { name, description, price, categoryId: cats[slug] } }); });
  const products = [["A4 Notepad", "Ruled notepad", 65, 50], ["Ball Pen Pack", "Blue ball pens", 120, 40], ["File Folder", "Everyday file folder", 35, 60], ["Register", "Ruled writing register", 140, 30]] as const;
  for (const [name, description, price, stock] of products) { const found = await prisma.product.findFirst({ where: { name } }); if (!found) await prisma.product.create({ data: { name, description, price, stock, categoryId: cats.stationery } }); }
}
main().finally(() => prisma.$disconnect());
