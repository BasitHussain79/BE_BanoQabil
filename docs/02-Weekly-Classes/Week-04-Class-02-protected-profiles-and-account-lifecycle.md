# Week 04 · Class 02 — Protected Profiles and Account Lifecycle

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Allow only safe self-service changes and explain token lifecycle limits.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Password change does not invalidate a previously issued valid JWT.

## 3. Concepts covered

- req.user
- allowlist PATCH
- current password
- deactivate
- client logout

## 4. Real-world example

Password change does not invalidate a previously issued valid JWT.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Authenticate→validate profile/password→scoped User write→safe projection.

## 7. Database flow

Deactivate sets active=false; next protected request loads inactive User and denies.

## 8. Files involved

- `src/services/marketplace.js`
- `src/middleware/auth.js`
- `src/routes`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Profile GET/PATCH, invalid phone, old password incorrect/correct, logout then reuse, deactivate then retry.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

### Allowlisted profile update and deactivation

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { User } from '../models/index.js';

export async function updateMe(userId, input) {
  // Never copy role, verified, active or password from req.body.
  const patch = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.city !== undefined) patch['profile.city'] = input.city;
  if (input.phone !== undefined) patch['profile.phone'] = input.phone;
  const updated = await User.findOneAndUpdate(
    { _id: userId, active: true, verified: true },
    { $set: patch }, { new: true, runValidators: true },
  );
  if (!updated) { const e = new Error('Not found'); e.status = 404; throw e; }
  return { id: updated.id, name: updated.name,
    email: updated.email, city: updated.profile?.city };
}

export async function deactivateMe(userId) {
  // Soft account deactivation; it is NOT GDPR-style permanent erasure.
  await User.updateOne({ _id: userId, active: true }, { $set: { active: false } });
  return { deactivated: true };
}
```

**Why this code exists:** Allowlisting prevents mass assignment. Deactivation invalidates future authenticated requests because auth reloads the User.

**Try it:** Send role=admin in profile PATCH; verify it is not updated. Deactivate then retry with the old token.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Verify old password before changing it

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import bcrypt from 'bcrypt';
import { User } from '../models/index.js';

export async function changeMyPassword(userId, oldPassword, newPassword) {
  const user = await User.findById(userId).select('+password');
  if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
    const e = new Error('Invalid credentials'); e.status = 401; throw e;
  }
  if (newPassword.length < 12 || newPassword.length > 72 ||
      Buffer.byteLength(newPassword) > 72) {
    const e = new Error('Invalid password'); e.status = 422; throw e;
  }
  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();
  // No token blacklist exists: old unexpired JWTs remain usable.
  return { changed: true };
}
```

**Why this code exists:** Checking the old password is reauthentication; password changes are not JWT revocation in the documented source.

**Try it:** Change password; show that a previously issued JWT still authenticates before its expiry.

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

Object.assign(req.body), calling deactivation data erasure, revocation claims. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Demonstrate account lifecycle and sketch a future token revocation design.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Profiles and Users](../01-API-and-System-Topics/02-Profiles-and-Users.md)
- [Errors and HTTP Statuses](../01-API-and-System-Topics/13-Errors-and-HTTP-Statuses.md)

[Return to course index](../README.md)
