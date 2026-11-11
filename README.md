# COPYCAT COPIERS

Responsive Next.js app foundation for a print and stationery ordering service with in-store collection only.

## Run locally

1. Install Node.js 20+ and run `npm install`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` (SQLite is suitable for local development).
3. Run `npm run db:generate`, `npm run db:push`, and `npm run db:seed`.
4. Run `npm run dev` and open `http://localhost:3000`.

## Current implementation

- Responsive home, customer portal and owner dashboard shells.
- Prisma data model for customers, catalog, orders, stock, payments and pickup verification state.
- Seed catalog for common print and stationery items.
- Pickup-only language throughout: there is no delivery or courier option.

## Production work and credentials

This initial commit is an application foundation, not a production-ready commerce system. Before accepting real customers or payments, implement and test authenticated customer/admin sessions, authorization on every API, verified SMS OTP delivery with rate limits, secure document storage/scanning, transactional stock/order updates, server-verified Razorpay orders/webhooks, invoice/report generation, and monitoring/backups. No order should be treated as paid until the gateway signature/webhook is verified; do not rely on screenshots.

Configure production secrets using your hosting provider's secret manager, never commit them: `DATABASE_URL` (managed PostgreSQL recommended), Razorpay key ID/secret and webhook secret, SMS OTP provider credentials, secure object-storage credentials, and session/JWT secret. Use TLS, private file access, retention controls, backups, and a documented refund process.

## Routes

- `/` Home
- `/customer` Customer entry point
- `/admin` Owner dashboard entry point (must be protected before production use)
