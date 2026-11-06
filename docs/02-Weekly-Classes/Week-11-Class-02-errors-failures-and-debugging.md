# Week 11 · Class 02 — Errors, Failures, and Debugging

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Keep errors consistent without leaking internal provider details.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. SMTP failure includes secret in internal Error; public sees safe generic message.

## 3. Concepts covered

- AppError
- async errors
- Mongo 409/422
- redacted 500
- compensation

## 4. Real-world example

SMTP failure includes secret in internal Error; public sees safe generic message.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Service throws→Express forwards→final mapping→safe JSON.

## 7. Database flow

Check database state after errors; cleanup may be created.

## 8. Files involved

- `src/utils/errors.js`
- `src/middleware/errors.js`
- `src/controllers/http.js`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Trigger malformed JSON, invalid cast, duplicate key, VersionError and provider exception.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

### Map expected failures and redact unknown errors

**File illustrated:** `src/middleware/errors.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import mongoose from 'mongoose';
import multer from 'multer';

export class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err); // Express can no longer replace body
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err?.code === 11000 || err instanceof mongoose.Error.VersionError) {
    return res.status(409).json({ error: 'Conflict' });
  }
  if (err instanceof mongoose.Error.ValidationError ||
      err instanceof mongoose.Error.CastError || err instanceof multer.MulterError) {
    return res.status(422).json({ error: 'Invalid request' });
  }
  // Do not send SMTP/Cloudinary/internal stack traces or secrets to clients.
  return res.status(500).json({ error: 'Internal server error' });
}
```

**Why this code exists:** A stable error contract prevents accidental exposure of provider exceptions.

**Try it:** Throw an Error containing a dummy SMTP password; confirm the client sees only a redacted 500.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Keep controller response translation thin

**File illustrated:** `src/controllers/http.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
// Express 5 forwards rejected async handler promises to error middleware.
export const respond = (action, successStatus = 200) => async (req, res) => {
  const result = await action(req); // service owns business decisions
  return res.status(successStatus).json({ data: result });
};

// Example route composition (reference wiring):
// router.post('/ads', requireAuth, validateCreateAd,
//   respond((req) => services.createDraft(req.user.id, req.body), 201));
// The service must pick allowed fields; never persist req.body wholesale.
```

**Why this code exists:** Controller has one job: translate a service result into the established JSON envelope.

**Try it:** Trace how an AppError becomes an error response through Express 5 middleware.

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

Returning raw error.message, only testing status. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Deliver error catalog with public response, DB effect and operator action.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Errors and HTTP Statuses](../01-API-and-System-Topics/13-Errors-and-HTTP-Statuses.md)

[Return to course index](../README.md)
