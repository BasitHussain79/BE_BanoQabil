# Quick Start — Project 01

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Requirements

- Node.js `>=24 <25`; npm and project lockfile.
- MongoDB instance on your development machine.
- API client: Postman (use supplied assets).
- SMTP capture such as Mailpit (`localhost:1025`) for OTP inspection.
- Optional real Cloudinary credentials for image lessons.

## Install

```bash
cd project-01-olx
npm ci
cp .env.example .env
```

## Local `.env` example

```dotenv
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/basit_marketplace
JWT_SECRET=replace-with-at-least-32-random-characters
OTP_SECRET=use-another-random-secret-at-least-32-characters
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
MAIL_FROM=classroom@example.test
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Use **real, separate development secrets** and never commit `.env`.

## Start and check

```bash
npm start
curl http://localhost:4000/health
npm run dev
```

`npm start` and `npm run dev` are **alternative** commands for normal/watch mode. A typical health response resembles `{"status":"OK","uptime":12.34}`; uptime changes.

## Verify account and promote admin

1. Signup through `POST /api/auth/signup`.
2. Read code from your SMTP sandbox; verify through `POST /api/auth/verify`.
3. Promote the verified account (in project terminal):

```bash
npm run admin -- verified-user@example.test
```

4. Login again. The API reloads current roles, but a fresh token keeps the manual journey simple.

## Tests and Postman

```bash
npm test
```

Import `postman/collection.json` and `postman/environment.json`; run the collection **in its intended sequence**. Choose an actual JPEG, PNG or WebP in the images request.

## Environmental failure caveat

MongoDB Memory Server may require binding a local port; restrictive sandboxes sometimes yield `listen EPERM`. This alone does not establish an assertion failure. Run locally where port binding is allowed.

See [Health & Authentication](../01-API-and-System-Topics/01-Health-and-Authentication.md) and [Testing & Postman](../01-API-and-System-Topics/15-Testing-and-Postman.md).
