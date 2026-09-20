# BizKit India 0.7.0

A multi-page, PostgreSQL-backed small-business workspace for Indian businesses.

The public site and business workspace use dedicated HTML documents per route, with shared JavaScript rendering and a shared Express/PostgreSQL backend.

## What is actually included
- Separate public marketing pages: home, features, pricing, resources
- Separate app routes/pages: dashboard, invoices, invoice detail/new, quotations, customers, customer detail, products, product detail, purchases, payments, expenses, reports, tools, settings, integrations
- Real PostgreSQL persistence through Supabase
- Auth with JWT + bcrypt
- Customers and customer ledgers
- Products, stock and stock movement history
- Suppliers
- Purchases API that increments stock with transactional safeguards
- Invoices with status tracking
- Quotations with invoice conversion
- Payments and invoice status synchronization with balance validation
- Expenses
- Dashboard and six-month sales/expense report
- Global search across customers/products/invoices
- Razorpay Payment Link adapter (enabled when Render has RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)
- Integration status page
- GST, margin, break-even and salary tools
- Mobile navigation and responsive UI
- Transaction-safe stock edits, invoice edits and invoice deletion guards
- Render Docker deployment

## External APIs
Razorpay Payment Links are implemented server-side. Credentials are optional and belong only in Render environment variables. WhatsApp and email have integration status slots but are intentionally not faked: their API credentials are required before they can send live messages.

## Required Render environment variables
`DATABASE_URL`, `JWT_SECRET`. Optional: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `PUBLIC_APP_URL`.
