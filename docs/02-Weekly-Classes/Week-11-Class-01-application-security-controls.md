# Week 11 · Class 01 — Application Security Controls

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Identify layered controls and realistic threat boundaries.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Malformed body with password should be rejected without echoing sensitive text.

## 3. Concepts covered

- App/auth limits
- bcrypt/HMAC/JWT
- allowlists
- upload signatures
- resource privacy

## 4. Real-world example

Malformed body with password should be rejected without echoing sensitive text.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Limit→parse→validate→authenticate→authorize→invariant→safe output.

## 7. Database flow

Indexes/conditional writes complement request-time validation.

## 8. Files involved

- `src/app.js`
- `src/middleware`
- `src/validators`
- `src/services/auth.js`
- `src/services/images.js`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Threat matrix for brute OTP, token forgery, role escalation, fake uploads, regex and large JSON.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

### Educational in-process sliding window

**File illustrated:** `src/middleware/limits.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
export function localWindowLimit({ max, windowMs = 60_000, now = () => Date.now() }) {
  const store = new Map(); // local to ONE Node process, not distributed
  return (req, res, next) => {
    const ip = req.ip; // configure trust proxy EXACTLY for your ingress
    const bucket = store.get(ip);
    const current = now();
    const entry = !bucket || current - bucket.started >= windowMs
      ? { started: current, count: 0 } : bucket;
    entry.count += 1;
    store.set(ip, entry);
    if (entry.count > max) return res.status(429).json({ error: 'Too many requests' });
    next();
  };
}
// Example wiring: app.use(localWindowLimit({ max: 300 }));
// Auth routes additionally use localWindowLimit({ max: 30 }).
// Educational example: implement eviction and shared atomic limits in production.
```

**Why this code exists:** In-memory maps have different counts per process and need cleanup; they are NOT a cluster-wide defense.

**Try it:** Explain behavior with two replicas and why shared storage and correct proxy config are needed.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Validate input at the HTTP boundary

**File illustrated:** `src/validators/ads.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { body, param, query, validationResult } from 'express-validator';

// PATCH accepts only fields the service can safely apply.
export const adTitle = body('title').optional().isString().trim().isLength({ min: 5, max: 100 });
export const adPrice = body('price').optional().isFloat({ min: 1, max: 1_000_000_000 });
export const adId = param('id').isMongoId();
export const listPage = query('page').optional().isInt({ min: 1, max: 1000 });
export const listLimit = query('limit').optional().isInt({ min: 1, max: 50 });

export function requireValid(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    // Do not echo raw request bodies or sensitive rejected input.
    return res.status(422).json({ error: 'Invalid request' });
  }
  next();
}
```

**Why this code exists:** HTTP boundary validation complements Mongoose schema validation and DB uniqueness.

**Try it:** Send a page=1001 and a malformed ObjectId; confirm they are rejected before reaching a service.

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

Trust-all proxies, CORS as authorization, process-local limit as distributed limit. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Submit prioritized threat matrix and production gaps.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Security, RBAC, Ownership and Privacy](../01-API-and-System-Topics/11-Security-RBAC-and-Ownership.md)
- [Validation and Operational Limits](../01-API-and-System-Topics/12-Validation-and-Operational-Limits.md)

[Return to course index](../README.md)
