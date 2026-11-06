# Week 03 · Class 01 — Secure User Registration

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Protect credential collection and identity uniqueness.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Aisha@Example.test and aisha@example.test should represent one normalized identity.

## 3. Concepts covered

- Email normalization
- bcrypt 12
- 72 bytes
- safe projection
- limits

## 4. Real-world example

Aisha@Example.test and aisha@example.test should represent one normalized identity.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Signup→validate→hash→generate/store OTP state→create User→SMTP→safe data.

## 7. Database flow

User begins role=user, active=true, verified=false; hash values not returned.

## 8. Files involved

- `src/services/auth.js`
- `src/models/index.js`
- `src/validators`
- `src/routes`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Try valid signup, duplicate email, short password, over-72-byte Unicode, and extra role field.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

### Normalize and validate registration input

**File illustrated:** `src/validators/auth.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { body } from 'express-validator';

export const signupRules = [
  body('name').isString().trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 12, max: 72 })
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72),
];
// Verify rule set is paired with requireValid on the route.
// Validation is not authorization: do not accept role / active / verified.
```

**Why this code exists:** Length validation must check both Unicode character and UTF-8 byte boundaries.

**Try it:** Try 72 multi-byte characters and show the 72-byte bcrypt boundary still rejects it.

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

### Explain the request end to end

1. **Input:** Which HTTP fields come from the client? Which values must be derived from the current User or database?
2. **Policy:** Point to the authentication, role, owner, participant, validation or state check.
3. **Database/provider effects:** Identify the conditional query, schema/index, and any SMTP/Cloudinary operation.
4. **Failure:** Predict HTTP status AND durable state when one operation fails.
5. **Evidence:** Capture a successful request, a denied request, and a database or fake-provider assertion.

## 10. Code explanation / tracing exercise

Write a five-column trace table: **route** | **validator/middleware** | **service rule** | **database/provider operation** | **public response**. Fill it from the actual source, not from assumed Express scaffolding. If a source snippet is absent, leave its exact identifier as `verify in source`.

## 11. Best practices

- Keep user-controlled input distinct from server-derived identity, role, owner, participant, and status.
- Use bounded validation and purpose-built queries rather than forwarding raw request objects to the database.
- Test persistent state, not just the HTTP status.
- Explain omitted features accurately: no React dashboard, payments, WebSockets, or deployed infrastructure in this project.

## 12. Common mistakes

Plaintext password, allowing verified/role in request, returning raw doc. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Record response and persisted data for five signup variants.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Health and Authentication](../01-API-and-System-Topics/01-Health-and-Authentication.md)
- [Validation and Operational Limits](../01-API-and-System-Topics/12-Validation-and-Operational-Limits.md)

[Return to course index](../README.md)
