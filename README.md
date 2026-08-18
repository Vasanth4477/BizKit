# BizKit India - PostgreSQL edition

This build moves BizKit from browser/SQLite persistence to PostgreSQL.

## Required Render environment variables
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: long random secret (Render can generate this)
- `NODE_ENV=production`

## Supabase Free
Create a Supabase free project and use its PostgreSQL connection string. Do not paste the real URL/password into GitHub or chat.

## Deploy
1. Put these files in the GitHub repository connected to your existing Render service.
2. In Render > BizKit > Environment, add `DATABASE_URL` with your PostgreSQL connection string.
3. Ensure `JWT_SECRET` exists.
4. Redeploy.
5. Check `/api/health` and confirm database is `postgresql`.
6. Create an account and test persistence.

Tables are created automatically on first successful database connection.


## 0.4.1 deployment fix

This build keeps BizKit on PostgreSQL/Supabase and forces the Node PostgreSQL client to prefer IPv4 (`family: 4`), with a 10-second connection timeout and TCP keep-alive. This is intended for Render, which is IPv4-only according to Supabase's current network compatibility documentation.

### Render DATABASE_URL

Use the **Supabase Connect → Session pooler** connection string, not the Direct connection string.

It should use:
- host ending in `.pooler.supabase.com`
- port `5432`
- database `postgres`

Do not paste the database password into GitHub or this package. Put the complete connection string only in Render → BizKit → Environment → `DATABASE_URL`.

After changing it, deploy the latest commit and open:
`https://<your-render-service>/api/health`

A successful response should contain:
`{"ok":true,"service":"BizKit","version":"0.4.1","database":"postgresql"}`
