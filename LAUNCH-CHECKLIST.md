# BizKit launch checklist

Completed in Phase 1–4 + production QA hardening:
- Mature responsive product design and dedicated multipage routing
- India-first INR, GSTIN and HSN/SAC business data model
- JWT authentication with PostgreSQL persistence
- Customer and supplier management with delete guards
- Product catalogue, stock tracking and stock movement history
- Transaction-safe invoice creation, editing, payment status and inventory reconciliation
- Invoice cancellation with inventory reversal and cancellation safeguards
- Quotation creation, lifecycle controls and conversion to invoice
- Purchase receipt, editing, stock reconciliation and cancellation
- Payment ledger with balance validation and auditable payment reversal
- Expense create/edit/delete workflow
- Dashboard, reports, activity and global search
- Razorpay Payment Link adapter
- Mobile navigation and responsive workspace UI
- Production Docker configuration for Render
- Password change and secure password reset flow
- Auth/API rate limiting and security headers
- Public privacy, terms and refund pages
- Automated CI smoke QA

Before paid public launch:
- Add email verification
- Configure production SMTP credentials and verify reset-email delivery
- Add durable distributed rate limiting if multiple application instances are introduced
- Add analytics and application error monitoring
- Add a payment provider webhook/reconciliation flow for automated payment updates
- Add subscription entitlements when paid plans go live
- Run browser-level and API integration tests against a dedicated staging PostgreSQL database
- Add automated CI checks for syntax, smoke tests and migration safety
