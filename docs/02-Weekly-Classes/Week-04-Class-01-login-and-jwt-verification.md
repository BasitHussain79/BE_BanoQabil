# Week 04 · Class 01 — Login and JWT Verification

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Issue constrained JWTs and reload current authorization state.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. An old admin bearer token loses admin access after user is demoted.

## 3. Concepts covered

- Bearer
- HS256
- issuer/audience/subject
- expiry
- jwt.verify

## 4. Real-world example

An old admin bearer token loses admin access after user is demoted.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Login→compare bcrypt→active/verified→sign; protected→verify claims→load User→authorize.

## 7. Database flow

No session document; current user is read on every protected request.

## 8. Files involved

- `src/services/auth.js`
- `src/middleware/auth.js`
- `src/models/index.js`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Test unverified login, wrong password, malformed Bearer, tampered JWT, expired token and demotion.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

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

Calling jwt.decode authorization, trusting role claim, weak JWT secret. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Submit a status matrix and explain identity versus authority.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Health and Authentication](../01-API-and-System-Topics/01-Health-and-Authentication.md)
- [Security, RBAC, Ownership and Privacy](../01-API-and-System-Topics/11-Security-RBAC-and-Ownership.md)

[Return to course index](../README.md)
