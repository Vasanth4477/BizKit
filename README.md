# BizKit India 0.8.0

A multi-page, PostgreSQL-backed small-business workspace for Indian businesses.

The public site and business workspace use dedicated HTML documents per route, with shared JavaScript rendering and a shared Express/PostgreSQL backend.

## What is actually included
- Separate public marketing pages: home, features, pricing, resources
- Separate app routes/pages: dashboard, invoices, invoice detail/new, quotations, customers, customer detail, products, product detail, purchases, payments, expenses, reports, tools, settings, integrations
- Real PostgreSQL persistence through Supabase
- Auth with JWT + bcrypt
- Customers and customer ledgers
- Products, stock and stock movement history
- Suppliers with edit/delete guards
- Purchases with transactional stock receipt, edit/reconciliation and cancellation
- Invoices with status tracking
- Quotations with invoice conversion
- Payments and invoice status synchronization with balance validation and auditable reversal
- Expenses
- Dashboard and six-month sales/expense report
- Global search across customers/products/invoices
- Razorpay Payment Link adapter (enabled when Render has RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)
- Integration status page
- GST, margin, break-even and salary tools
- Mobile navigation and responsive UI
- Transaction-safe stock edits, invoice/purchase edits, purchase cancellation and invoice deletion guards
- Render Docker deployment
- Password change and secure password reset flows
- Authentication and API rate limiting
- Public privacy, terms and refund pages

## External APIs
Razorpay Payment Links are implemented server-side. Credentials are optional and belong only in Render environment variables. Razorpay is implemented server-side. Password reset email delivery uses SMTP when the SMTP settings are configured. WhatsApp remains a status slot until its API credentials and send workflow are implemented.

## Required Render environment variables
`DATABASE_URL`, `JWT_SECRET`. Optional: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `PUBLIC_APP_URL`, `APP_TIMEZONE`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
