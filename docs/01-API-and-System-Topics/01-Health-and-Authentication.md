# Health and Authentication

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

Process health, account creation, secure email OTP verification, JWT login, and client-side logout. This is the entry point for every authenticated marketplace workflow.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Process status and uptime |
| `POST` | `/api/auth/signup` | Public; auth limit | Create unverified user and initiate OTP email |
| `POST` | `/api/auth/verify` | Public; auth limit | Consume verification OTP |
| `POST` | `/api/auth/resend` | Public; auth limit | Replace eligible OTP after cooldown |
| `POST` | `/api/auth/login` | Public; auth limit | Issue JWT and public user |
| `POST` | `/api/auth/logout` | Authenticated | Client deletes its token; no server-side revocation |

## How the implementation works

1. Validate/normalize registration name, email, and password. Do not accept role, verified, or active from the client.
2. Hash password using bcrypt cost 12; generate a six-digit OTP with crypto.randomInt.
3. Store only HMAC(normalized email + code) and expiry/attempt state on User; send plaintext OTP via SMTP.
4. Verify OTP atomically using active, unverified, hash, expiry, and attempts predicates. On success clear consumed OTP state.
5. During login compare hidden password, require active/verified user, sign HS256 JWT with fixed issuer, audience, subject, and one-day expiry.
6. For each authenticated request validate token signature/claims and reload User from MongoDB.
7. Logout tells the client to discard its token; existing valid tokens are not revoked.

## Invariants and exact boundaries

- Secrets JWT_SECRET and OTP_SECRET are separate and at least 32 characters.
- Password requires 12–72 characters AND no more than 72 UTF-8 bytes.
- OTP: 6 digits, ten-minute expiry, fewer than five failed attempts, sixty-second resend cooldown.
- HS256 JWT, issuer `basit-marketplace`, audience `marketplace-client`, one-day validity.
- Unverified/inactive login is documented as 403; a protected request for unavailable identity is 401.
- GET /health is process liveness, not proof of MongoDB/SMTP/Cloudinary readiness.
- Signup can leave an unverified User persisted if SMTP fails; fix SMTP and follow resend rules.

## Database responsibilities

- User: normalized unique email, hidden password, role=user default, active, verified, OTP hash/expiry/attempt/sent state.
- No separate OTP or server-side session collection.

## Request or design example

```http
POST /api/auth/signup
Content-Type: application/json

{"name":"Aisha Khan","email":"aisha@example.test","password":"classroom-password"}
```

```http
POST /api/auth/verify
Content-Type: application/json

{"email":"aisha@example.test","code":"123456"}
```

```http
POST /api/auth/login
Content-Type: application/json

{"email":"aisha@example.test","password":"classroom-password"}
```

The OTP above is a **placeholder**, not a reusable or preconfigured code. Read the actual email in Mailpit. Successful `/api` responses use `{ "data": ... }`.

## Verification checklist

- [ ] Successful signup, OTP verify, login, and /api/users/me using Bearer token.
- [ ] Duplicate email; short password; Unicode password over 72 bytes.
- [ ] Wrong, expired, consumed, or fifth-failure OTP; resend before/after 60 seconds.
- [ ] Race two identical correct OTP requests: exactly one succeeds.
- [ ] Invalid JWT signature, wrong issuer/audience/algorithm, expired token, invalid subject.
- [ ] Unverified, inactive, and demoted accounts; token remains valid identity but permission changes.
- [ ] SMTP failure after signup; the persisted account is not accidentally considered verified.

## Common mistakes

- Store or log plaintext OTP/password; trust client role or verified field.
- Use Math.random for OTP; treat frontend logout as token revocation.
- Validate JWT by decoding without verifying algorithm and claims.
- Claim health endpoint verifies database readiness.

## Practical assignment

Demonstrate signup → captured email → verify → login → protected profile; then provide an evidence matrix for replay, expiry, lockout, invalid JWT, inactive user, and failed SMTP. Cite both HTTP status and database effect.

## Source files to inspect

- `src/services/auth.js`
- `src/middleware/auth.js`
- `src/utils/otp.js`
- `src/config/` SMTP adapter
- `src/models/index.js`
- `src/routes/`
- `tests/core.test.js`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
