# Deploy BizKit 0.6.0

1. Replace your GitHub repository contents with this package and commit to `main`.
2. Keep the existing Render service. Do not create another service.
3. In Render → BizKit → Environment, keep `JWT_SECRET` and the working Supabase Session Pooler `DATABASE_URL` (pooler host, port 5432).
4. Optional: add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` for payment links. Never commit these credentials.
5. Save/rebuild/deploy.
6. Open `/api/health`. It should return `ok:true`, `database:"postgresql"`, version `0.6.0` and the feature list.
7. Test `/signup`, `/app`, `/app/customers`, `/app/products`, `/app/invoices`, `/app/payments`, and `/app/reports`.

## Security
Use a newly rotated Supabase password if the old one was ever exposed. Never put `DATABASE_URL`, JWT secrets, Razorpay keys or any other secrets in GitHub or frontend JavaScript.
