# BizKit India 0.6.0

A multi-page, PostgreSQL-backed small-business workspace for Indian businesses.

## What is actually included
- Separate public marketing pages: home, features, pricing, resources
- Separate app routes/pages: dashboard, invoices, invoice detail/new, quotations, customers, customer detail, products, product detail, purchases, payments, expenses, reports, tools, settings, integrations
- Real PostgreSQL persistence through Supabase
- Auth with JWT + bcrypt
- Customers and customer ledgers
- Products, stock and stock movement history
- Suppliers
- Purchases API that increments stock
- Invoices with status tracking
- Quotations
- Payments and invoice status synchronization
- Expenses
- Dashboard and six-month sales/expense report
- Global search across customers/products/invoices
- Razorpay Payment Link adapter (enabled when Render has RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)
- Integration status page
- GST, margin, break-even and salary tools
- Mobile navigation and responsive UI
- Render Docker deployment

## External APIs
Razorpay Payment Links are implemented server-side. Credentials are optional and belong only in Render environment variables. WhatsApp and email have integration status slots but are intentionally not faked: their API credentials are required before they can send live messages.

## Required Render environment variables
`DATABASE_URL`, `JWT_SECRET`. Optional: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `PUBLIC_APP_URL`.
