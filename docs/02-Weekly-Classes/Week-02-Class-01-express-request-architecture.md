# Week 02 · Class 01 — Express Request Architecture

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Understand middleware order, HTTP boundaries and thin service adapters.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. GET /api/ads?limit=500 should fail before querying MongoDB.

## 3. Concepts covered

- Routing
- express-validator
- middleware order
- respond
- Express 5 async errors

## 4. Real-world example

GET /api/ads?limit=500 should fail before querying MongoDB.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Global limit→JSON parser→route→validators→auth/roles→respond→service→error handler.

## 7. Database flow

Validation and authorization must happen before persistent operations.

## 8. Files involved

- `src/app.js`
- `src/routes`
- `src/controllers/http.js`
- `src/validators`
- `src/middleware/errors.js`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Trace one public GET, one protected POST, and an invalid query; annotate each stage and response envelope.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

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

### Wire routes, middleware and provider dependencies

**File illustrated:** `src/app.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import express from 'express';
import { errorHandler } from './middleware/errors.js';

export function createApp({ authRoutes, marketplaceRoutes }) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/health', (_req, res) => res.json({ status: 'OK', uptime: process.uptime() }));
  app.use(express.json({ limit: '32kb' }));
  // Providers/services are assembled outside and passed into the route factories.
  app.use('/api/auth', authRoutes);
  app.use('/api', marketplaceRoutes);
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler); // always AFTER routes and 404 handler
  return app; // no .listen(), so Supertest can reuse it
}
```

**Why this code exists:** createApp constructs the HTTP app without owning the network listener.

**Try it:** Pass fake mailer/image adapters into your route factory, then test with Supertest.

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

Embedding business logic in route handlers or exposing validation internals. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Create annotated pipelines for POST /api/ads and invalid pagination.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Architecture and Dependency Injection](../01-API-and-System-Topics/16-Architecture-and-Dependency-Injection.md)
- [Validation and Operational Limits](../01-API-and-System-Topics/12-Validation-and-Operational-Limits.md)

[Return to course index](../README.md)
