# BizKit India backend starter

This is the next-stage architecture for the BizKit MVP.

## Run locally

1. Install Node.js 20+.
2. Open a terminal in this folder.
3. Run `npm install`.
4. Set a strong `JWT_SECRET` environment variable.
5. Run `npm start`.
6. Open `http://localhost:3000`.

The API provides:
- Signup/login with bcrypt password hashing
- JWT authentication
- Per-user customers
- Per-user products/services
- Per-user business profile
- SQLite persistence

## Important

The existing browser MVP is still the UI. The API is intentionally separated so we can migrate the UI from localStorage to these endpoints next.

Before production, add HTTPS, a managed database, secure secret storage, rate limiting, CSRF protections where applicable, email verification, password reset, audit logging, backups, and proper session/token rotation.


## Deployment preparation

This project now includes a Dockerfile and `render.yaml` for deployment on a persistent-disk web service. The SQLite database must live on persistent storage. Do not deploy this SQLite setup to an ephemeral filesystem.

The deployment configuration generates a JWT secret automatically. Before going live, also add HTTPS, rate limiting, email verification, password reset, backups, monitoring, and a proper production database plan if usage grows.
