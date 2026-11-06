# Week 03 · Class 02 — Email OTP Verification

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Build one-time email verification resistant to replay, guessing and races.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Two simultaneous correct verifies yield only one success.

## 3. Concepts covered

- crypto.randomInt
- HMAC
- SMTP
- expiry
- resend cooldown
- atomic consume

## 4. Real-world example

Two simultaneous correct verifies yield only one success.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

OTP generation→hash(email:code)→store expiry/attempts→email→conditional verify.

## 7. Database flow

OTP lives on User; success removes OTP hash/expiry and sets verified.

## 8. Files involved

- `src/utils/otp.js`
- `src/services/auth.js`
- `src/config`
- `tests/core.test.js`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Use fake clock for +59s vs +60s resend, +10min expiry; run five failed guesses, replay and concurrency.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

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

Using Math.random, storing plaintext OTP, updating verified in separate steps. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Provide a threat table and race test with DB evidence.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Health and Authentication](../01-API-and-System-Topics/01-Health-and-Authentication.md)
- [Testing and Postman](../01-API-and-System-Topics/15-Testing-and-Postman.md)

[Return to course index](../README.md)
