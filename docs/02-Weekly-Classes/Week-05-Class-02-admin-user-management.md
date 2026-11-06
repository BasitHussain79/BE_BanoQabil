# Week 05 · Class 02 — Admin User Management

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Bootstrap verified admin and safely modify other accounts.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Deactivating a target makes their next authenticated request return 401.

## 3. Concepts covered

- Promotion script
- pagination
- roles
- active flag
- self-restriction

## 4. Real-world example

Deactivating a target makes their next authenticated request return 401.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Verify/promote→admin login→list users→validate target patch→reload role for target.

## 7. Database flow

User role and active state updated; publicUser filters returned fields.

## 8. Files involved

- `scripts/promote-admin.js`
- `src/services/marketplace.js`
- `src/routes`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Promote verified account, list page 1, modify target role, test self-update conflict and immediate demotion.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

### Bootstrap a verified administrator

**File illustrated:** `scripts/promote-admin.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import mongoose from 'mongoose';
import { User } from '../src/models/index.js';

// Run after connecting to MongoDB and loading validated environment secrets.
export async function promoteVerified(email) {
  const account = await User.findOneAndUpdate(
    { email: email.trim().toLowerCase(), active: true, verified: true },
    { $set: { role: 'admin' } }, { new: true },
  );
  if (!account) throw new Error('No active verified account found');
  console.log('Verified administrator promoted'); // never log credentials
  return { id: account.id, role: account.role };
}
// This is a bootstrap helper, not a public API route.
```

**Why this code exists:** The administrator cannot be bootstrapped through unprotected signup payload fields.

**Try it:** Verify an account first; reject promotion of a pending/unverified account.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Admin-only user changes cannot target the actor

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { User } from '../models/index.js';

export async function adminUpdateUser(actorId, targetId, changes) {
  if (String(actorId) === String(targetId)) {
    const e = new Error('Cannot change own admin record'); e.status = 409; throw e;
  }
  const patch = {};
  // Only these two administrative fields are accepted.
  if (changes.role !== undefined) patch.role = changes.role;
  if (changes.active !== undefined) patch.active = changes.active;
  const user = await User.findByIdAndUpdate(targetId, { $set: patch },
    { new: true, runValidators: true });
  if (!user) { const e = new Error('Not found'); e.status = 404; throw e; }
  return { id: user.id, name: user.name, email: user.email,
    role: user.role, active: user.active };
}
```

**Why this code exists:** Route-level roles("admin") and service-level self restriction handle different threats.

**Try it:** Try assigning moderator to a second account, then try updating the current administrator.

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

Promote unverified, trust old token role, leak password hash. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Submit admin promotion and least-privilege demo.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Profiles and Users](../01-API-and-System-Topics/02-Profiles-and-Users.md)
- [Security, RBAC, Ownership and Privacy](../01-API-and-System-Topics/11-Security-RBAC-and-Ownership.md)

[Return to course index](../README.md)
