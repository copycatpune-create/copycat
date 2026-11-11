# COPYCAT COPIERS

Responsive Next.js app foundation for a print and stationery ordering service with in-shop collection only.

## Run locally

1. Install Node.js 20+ and run `npm install`.
2. Copy `.env.example` to `.env`; keep the local SQLite URL and replace `ADMIN_API_KEY` with a random secret.
3. Run `npm run db:generate`, `npm run db:push`, and `npm run db:seed`.
4. Run `npm run dev` and open `http://localhost:3000`.
5. Enter the same `ADMIN_API_KEY` in the owner dashboard to view reports and operate the collection workflow.

## Current implementation

- Responsive home, customer storefront and owner dashboard.
- Prisma-backed catalog and order creation; server calculates prices from catalog records and reserves stationery stock transactionally.
- Owner-key protected reports and order actions.
- Pickup codes are generated only when an order is marked ready, stored as salted scrypt hashes, expire after 24 hours, and are limited to five verification attempts. Orders can only be collected once.
- Every order is collected from the shop; there is no delivery or courier option.

## Production readiness and credentials

This is still an early application foundation, not a production-ready commerce system. The owner API key is a temporary gate, not a full owner login/session system. Customer phone numbers currently identify order ownership but customer authentication and authorization are not implemented. Do not deploy with real customer data until those are replaced by secure OTP sessions and role-based authorization.

Online payment selection currently creates a **pending** payment record. It does not collect money or mark an order paid. Before launch, configure Razorpay (or another suitable gateway), implement order creation, signature and webhook verification on the server, and test refunds. Never mark payment successful based on a client claim or screenshot. Configure an SMS provider to deliver customer OTPs; in development only, the owner dashboard can display the pickup code for testing. Production must not reveal that code in the dashboard/API response.

Also configure secure private object storage for uploaded documents, file validation and malware scanning, environment-managed secrets, HTTPS, PostgreSQL, database backups, monitoring and retention policies. Never commit production credentials.

Required production integrations include `DATABASE_URL`, a high-entropy `ADMIN_API_KEY` until full auth replaces it, Razorpay key ID/secret/webhook secret, SMS provider credentials, secure object-storage credentials, and session/JWT secret.
