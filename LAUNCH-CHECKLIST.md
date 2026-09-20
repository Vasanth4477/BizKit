# BizKit launch checklist

Completed in Phase 1–3 + production QA hardening:
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

Before paid public launch:
- Add password reset and email verification
- Add rate limiting and abuse protection
- Add Privacy Policy, Terms and Refund pages
- Add analytics and application error monitoring
- Add a payment provider webhook/reconciliation flow for automated payment updates
- Add subscription entitlements when paid plans go live
- Run browser-level and API integration tests against a dedicated staging PostgreSQL database
- Add automated CI checks for syntax, smoke tests and migration safety
