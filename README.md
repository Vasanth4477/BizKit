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
