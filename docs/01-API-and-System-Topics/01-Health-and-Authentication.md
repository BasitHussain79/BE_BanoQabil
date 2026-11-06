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

## Annotated implementation examples (read alongside the real source)

> **Important:** These are newly written, commented **teaching implementations based on the supplied README**, **not recovered source code**. The published site did not expose the repository source for verification. Do not paste every example into one source file: overlapping snippets such as schema declarations are meant to be studied individually, then reconciled with your codebase. Each snippet identifies its intended source path and explains the business rule it demonstrates.

### Process-only liveness endpoint

**File illustrated:** `src/app.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import express from 'express';
export function createApp() {
  const app = express();
  // Liveness only: do not claim this validates DB/provider readiness.
  app.get('/health', (_req, res) => {
    res.json({ status: 'OK', uptime: process.uptime() });
  });
  app.use(express.json({ limit: '32kb' })); // bound JSON request size
  return app;
}
```

**Why this code exists:** A health endpoint checks the process, not every dependency.

**Try it:** Request /health before and after connecting MongoDB; explain why a 200 alone does not mean SMTP works.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### User schema, private fields and OTP state

**File illustrated:** `src/models/index.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// REFERENCE FIELD NAMES: align with your actual repository before copying.
const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, unique: true },
  password: { type: String, required: true, select: false }, // hide password hash
  role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
  active: { type: Boolean, default: true },
  verified: { type: Boolean, default: false },
  profile: {
    city: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  otp: {
    hash: { type: String, select: false }, // never return the HMAC
    expiresAt: Date,
    sentAt: Date,
    attempts: { type: Number, default: 0 },
  },
}, { timestamps: true });

// 'unique' creates an index; translate duplicate-key errors to HTTP 409.
export const User = model('User', userSchema);
```

**Why this code exists:** Only safe fields are normally selected, and the database enforces unique emails.

**Try it:** Register twice with differently cased versions of the same email; expect a duplicate-key conflict, not two accounts.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Generate and protect six-digit email codes

**File illustrated:** `src/utils/otp.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { randomInt, createHmac } from 'node:crypto';

// Always normalize identity before binding the OTP to it.
export const normalizedEmail = (email) => email.trim().toLowerCase();

export function generateCode() {
  // crypto.randomInt is suitable for security-sensitive random numbers.
  // padStart preserves leading zeroes, e.g., 000042.
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashCode(email, code, secret) {
  // Never persist the six-digit code itself.
  // A separate OTP_SECRET prevents reusing the JWT signing key.
  return createHmac('sha256', secret)
    .update(`${normalizedEmail(email)}:${code}`)
    .digest('hex');
}
```

**Why this code exists:** A code is tied to its normalized email address and stored as an HMAC instead of plaintext.

**Try it:** Change only the case of the email; demonstrate identical HMACs with the same secret and different HMACs for different email addresses.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Registration with bcrypt and SMTP failure semantics

**File illustrated:** `src/services/auth.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import bcrypt from 'bcrypt';
import { User } from '../models/index.js';
import { generateCode, hashCode, normalizedEmail } from '../utils/otp.js';

// Dependencies are injected so tests can replace SMTP and the clock.
export function makeRegistration({ mailer, otpSecret, now = () => new Date() }) {
  return async function signup({ name, email, password }) {
    const cleanEmail = normalizedEmail(email);
    // bcrypt considers only the first 72 bytes: reject longer UTF-8 values.
    if (password.length < 12 || password.length > 72 || Buffer.byteLength(password) > 72) {
      const e = new Error('Invalid password'); e.status = 422; throw e;
    }
    const code = generateCode();
    const sentAt = now();
    // Client never supplies role, verified or active.
    const user = await User.create({
      name, email: cleanEmail, password: await bcrypt.hash(password, 12),
      role: 'user', active: true, verified: false,
      otp: { hash: hashCode(cleanEmail, code, otpSecret),
        sentAt, expiresAt: new Date(+sentAt + 10 * 60_000), attempts: 0 },
    });
    // SMTP can fail AFTER MongoDB creates the user. Do not silently roll back.
    await mailer.sendVerification({ to: cleanEmail, code });
    return { id: user.id, email: user.email, verified: user.verified };
  };
}
```

**Why this code exists:** Creates only server-authorized fields. The password is hashed before storage and external mail delivery is a separate failure boundary.

**Try it:** Use a fake mailer that throws, then verify the unverified User still exists; use resend after its cooldown.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Atomically consume a valid OTP

**File illustrated:** `src/services/auth.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { User } from '../models/index.js';
import { hashCode, normalizedEmail } from '../utils/otp.js';

export function makeVerifier({ otpSecret, now = () => new Date() }) {
  return async function verify({ email, code }) {
    const cleanEmail = normalizedEmail(email);
    const nowAt = now();
    // Every eligibility condition is checked in ONE conditional MongoDB write.
    // A second concurrent request cannot consume the same code again.
    const updated = await User.findOneAndUpdate(
      {
        email: cleanEmail, active: true, verified: false,
        'otp.hash': hashCode(cleanEmail, code, otpSecret),
        'otp.expiresAt': { $gt: nowAt },
        'otp.attempts': { $lt: 5 },
      },
      { $set: { verified: true },
        $unset: { 'otp.hash': 1, 'otp.expiresAt': 1, 'otp.sentAt': 1 },
      },
      { new: true, projection: { password: 0, 'otp.hash': 0 } },
    );
    if (updated) return { verified: true };
    // A real service separately performs a guarded attempt increment for
    // eligible incorrect guesses; never increment expired/verified accounts.
    const error = new Error('Invalid or expired code');
    error.status = 400;
    throw error;
  };
}
```

**Why this code exists:** Conditional writes are essential: a read-then-save verification would allow two simultaneous successful requests.

**Try it:** Start two simultaneous verifies with the same valid code; one should return success and the other a safe error.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Resend cooldown and bounded guesses

**File illustrated:** `src/services/auth.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { User } from '../models/index.js';
import { generateCode, hashCode, normalizedEmail } from '../utils/otp.js';

export async function resendOtp({ email, otpSecret, mailer, now = () => new Date() }) {
  const normalized = normalizedEmail(email);
  const time = now();
  const code = generateCode();
  // Compare-and-swap prevents two simultaneous resends inside a 60s window.
  const updated = await User.findOneAndUpdate(
    { email: normalized, active: true, verified: false,
      $or: [{ 'otp.sentAt': { $exists: false } },
        { 'otp.sentAt': { $lte: new Date(+time - 60_000) } }] },
    { $set: { 'otp.hash': hashCode(normalized, code, otpSecret),
      'otp.sentAt': time, 'otp.expiresAt': new Date(+time + 600_000),
      'otp.attempts': 0 } },
    { new: true },
  );
  if (!updated) { const e = new Error('Not eligible to resend'); e.status = 429; throw e; }
  // Delivery errors do not automatically remove the newly stored state.
  await mailer.sendVerification({ to: normalized, code });
  return { sent: true };
}
```

**Why this code exists:** The resend must be a conditional write rather than a separate time check.

**Try it:** Inject time at +59 seconds and +60 seconds. Explain why only the latter may succeed.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Issue a constrained JWT after successful login

**File illustrated:** `src/services/auth.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

export async function login({ email, password, jwtSecret }) {
  // The password field is excluded by default; explicitly opt in here.
  const user = await User.findOne({ email: email.trim().toLowerCase() })
    .select('+password');
  // Compare even when there is a candidate user; do not return a hash.
  if (!user || !(await bcrypt.compare(password, user.password))) {
    const e = new Error('Invalid credentials'); e.status = 401; throw e;
  }
  if (!user.active || !user.verified) {
    const e = new Error('Account unavailable'); e.status = 403; throw e;
  }
  const token = jwt.sign({}, jwtSecret, {
    algorithm: 'HS256', subject: user.id,
    issuer: 'basit-marketplace', audience: 'marketplace-client', expiresIn: '1d',
  });
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}
```

**Why this code exists:** The token carries account identity, not a trusted snapshot of role permissions.

**Try it:** Log in, then demote the user in MongoDB. The same token should no longer grant admin privileges on the next request.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Verify bearer token and reload current User

**File illustrated:** `src/middleware/auth.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/index.js';

export function requireAuth(jwtSecret) {
  return async (req, res, next) => {
    try {
      const match = /^Bearer (\S+)$/.exec(req.get('Authorization') ?? '');
      if (!match) return res.status(401).json({ error: 'Unauthorized' });
      // Pin allowed algorithm AND claims; never use jwt.decode for auth.
      const payload = jwt.verify(match[1], jwtSecret, {
        algorithms: ['HS256'], issuer: 'basit-marketplace',
        audience: 'marketplace-client',
      });
      if (!mongoose.isValidObjectId(payload.sub)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      // Every request uses current role, active and verified values from DB.
      const user = await User.findById(payload.sub);
      if (!user?.active || !user?.verified) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      req.user = user;
      next();
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}

export const roles = (...allowed) => (req, res, next) =>
  allowed.includes(req.user?.role)
    ? next()
    : res.status(403).json({ error: 'Forbidden' });
```

**Why this code exists:** The middleware rejects invalid identity with 401 and valid identity lacking permission with 403.

**Try it:** Try an expired token, an inactive user and a demoted admin.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

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
