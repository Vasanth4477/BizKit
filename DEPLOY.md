# BizKit 0.6.1 deployment

## GitHub
Upload the CONTENTS of this package to the ROOT of `Vasanth4477/BizKit` on the `main` branch. Do not nest the files in another folder. Root copies of `app.html`, `app.js`, `styles.css`, and `404.html` are intentional.

## Render
Use the existing BizKit service. Keep `DATABASE_URL` and `JWT_SECRET` in Render Environment Variables. Do not put secrets in GitHub.

## Health check
Open `/api/health`. Expected response begins with `\"ok\":true` and reports version `0.6.1` and database `postgresql`.
