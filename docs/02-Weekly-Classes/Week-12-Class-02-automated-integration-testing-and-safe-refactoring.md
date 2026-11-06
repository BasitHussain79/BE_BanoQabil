# Week 12 · Class 02 — Automated Integration Testing and Safe Refactoring

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Prove reliability with real HTTP/database stack and fake external services.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Advance fake time by 60 seconds without actually waiting.

## 3. Concepts covered

- Node test
- Supertest
- memory Mongo
- fake providers/clock
- race tests

## 4. Real-world example

Advance fake time by 60 seconds without actually waiting.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

createApp(fakes)→Supertest→route/service→memory Mongo→assert HTTP+DB.

## 7. Database flow

Disposable DB indexes ensure uniqueness tested; no production state.

## 8. Files involved

- `tests/core.test.js`
- `src/app.js`
- `src/services`
- `package.json`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Run npm test, inspect hooks, add one invariants regression, race OTP, stage provider failure.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

### In-process HTTP tests and deterministic dependencies

**File illustrated:** `tests/core.test.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';

let mongo;
before(async () => {
  // Disposable DB makes tests independent of a developer's real data.
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
after(async () => { await mongoose.disconnect(); await mongo.stop(); });

test('GET /health exposes process shape', async () => {
  const app = createApp({
    authRoutes: (_req, _res, next) => next(),
    marketplaceRoutes: (_req, _res, next) => next(),
  });
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'OK');
  assert.equal(typeof res.body.uptime, 'number');
});
```

**Why this code exists:** A test should execute the real app stack while faking fallible providers and time.

**Try it:** Add a negative HTTP test, then assert persisted MongoDB state after the error.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Concurrent OTP consume test skeleton

**File illustrated:** `tests/core.test.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Focused skeleton: create a verified=false user and capture an OTP using
// the fake mailer from your app factory. app and code are test fixtures.
test('one-time OTP is consumed by only one contender', async () => {
  // const [first, second] = await Promise.all([
  //   request(app).post('/api/auth/verify').send({ email, code }),
  //   request(app).post('/api/auth/verify').send({ email, code }),
  // ]);
  // assert.deepEqual([first.status, second.status].sort(), [200, 400]);
  // const saved = await User.findOne({ email });
  // assert.equal(saved.verified, true);
  // assert.equal(saved.otp?.hash, undefined);
  assert.ok(true, 'Replace fixture comments with your source-specific setup');
});
```

**Why this code exists:** A test skeleton illustrates the required invariant without pretending unknown repository fixtures exist.

**Try it:** Build fixtures against your actual app factories, then replace this skeleton with assertions on both response and stored state.

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

Mocking all layers, real mail/cloud in tests, EPERM misdiagnosis. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Design and add a deterministic high-risk regression test.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Testing and Postman](../01-API-and-System-Topics/15-Testing-and-Postman.md)

[Return to course index](../README.md)
