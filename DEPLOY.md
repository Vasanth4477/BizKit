# BizKit 0.4.1 deployment

1. Replace the files in your GitHub `BizKit` repository with this package.
2. Commit and push to the `main` branch.
3. In Render, open **BizKit → Environment**.
4. Keep `JWT_SECRET`.
5. Set `DATABASE_URL` to the **Supabase Session pooler** URI from Connect. It must use the pooler host and port `5432`.
6. Save changes and deploy the latest commit.
7. Open `/api/health`.
8. It should return `ok: true` and `database: "postgresql"`.

Do not add a Supabase direct connection URL (`db.<project>.supabase.co`) for Render unless you have an IPv4 add-on. Do not expose your database password in GitHub, screenshots, chat, or frontend code.
