# BizKit 0.8.0 deployment

## Database migration
For a new database, apply `migrations/001_qa_hardening.sql` once before first use. The running service also performs safe column compatibility checks on startup.

## GitHub
Upload the CONTENTS of this package to the ROOT of `Vasanth4477/BizKit` on the `main` branch. Do not nest the files in another folder. Root copies of `app.html`, `app.js`, `styles.css`, and `404.html` are intentional.

## Render
Use the existing BizKit service. Keep `DATABASE_URL`, `JWT_SECRET`, and `APP_TIMEZONE` in Render Environment Variables. For password-reset email delivery, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. The production default is `Asia/Kolkata` for India-first date handling. Do not put secrets in GitHub.

## Health check
Open `/api/health`. Expected response begins with `\"ok\":true` and reports version `0.8.0` and database `postgresql`.

## Password recovery
Password reset links are sent only when SMTP settings are configured. The reset endpoint never reveals whether an email address belongs to an account.
