# Testing and Postman

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

End-to-end manual verification via Postman and repeatable integration tests using a disposable database, fake providers and controlled time.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Initial smoke test |
| `ALL` | `/api/*` | Varies | Positive and negative journey across modules |

## How the implementation works

1. Install with `npm ci`, copy `.env.example` and configure secrets, MongoDB and SMTP.
2. Use Mailpit/SMTP capture for real OTP manual flow; add Cloudinary for actual uploads.
3. Import `postman/collection.json` and `postman/environment.json`.
4. Run Postman in order so tokens/IDs are captured for dependent requests.
5. Set up verified/admin accounts and seed category before listing creation.
6. Execute publish/approve/search/favorite/conversation/report/sold/delete with real JPEG/PNG/WebP.
7. Run `npm test`; Supertest exercises createApp with fake adapters and MongoDB Memory Server.
8. Add controlled-time OTP and provider-failure tests; assert HTTP and persisted state.

## Invariants and exact boundaries

- Tests use Node built-in test runner, Supertest 7.1, MongoDB Memory Server 10.2.
- `createApp(dependencies)` accepts injected email/image/time fakes.
- Automated tests should be deterministic and not depend on real provider credentials.
- A restrictive runtime may cause `listen EPERM` in MongoDB Memory Server; verify on an allowed local environment.
- Running Postman out of order produces stale/missing variables; do not export secrets.

## Database responsibilities

- Disposable MongoDB verifies actual indexes and state invariants.
- Fakes observe OTP sends, Cloudinary uploads/destroys, and elapsed time.

## Request or design example

```bash
npm ci
cp .env.example .env
npm start
curl http://localhost:4000/health
npm test
```

The shell commands are from the README. Configure MongoDB and any SMTP/Cloudinary providers before corresponding manual steps.

## Annotated implementation examples (read alongside the real source)

> **Important:** These are newly written, commented **teaching implementations based on the supplied README**, **not recovered source code**. The published site did not expose the repository source for verification. Do not paste every example into one source file: overlapping snippets such as schema declarations are meant to be studied individually, then reconciled with your codebase. Each snippet identifies its intended source path and explains the business rule it demonstrates.

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

### Capture tokens and IDs for ordered Postman requests

**File illustrated:** `postman/collection.json` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
// Postman Tests tab for a successful login request:
const payload = pm.response.json();
pm.test('login returns a token in {data}', () => {
  pm.response.to.have.status(200);
  pm.expect(payload).to.have.property('data');
  pm.expect(payload.data).to.have.property('token');
});
// Keep secrets in LOCAL environments; do not commit populated exports.
pm.environment.set('accessToken', payload.data.token);

// For subsequent requests, set:
// Authorization: Bearer {{accessToken}}
// Do not assume the user's project uses any extra auth endpoints.
```

**Why this code exists:** Postman captures state across a multi-step workflow; a collection is not a substitute for automated integration tests.

**Try it:** Write tests to capture category/ad IDs; run the sequence with new seed data.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Ordered scenario with saved IDs and negative checks

**File illustrated:** `postman/collection.json` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
// Example Postman Tests tab for creating a draft ad:
const response = pm.response.json();
pm.test('create draft returns 201', () => {
  pm.response.to.have.status(201);
  pm.expect(response).to.have.property('data');
  pm.expect(response.data.status).to.eql('draft');
});
pm.environment.set('listingId', response.data._id ?? response.data.id);

// Follow-up Postman requests:
// POST {{baseUrl}}/api/ads/{{listingId}}/images (form-data images[])
// POST {{baseUrl}}/api/ads/{{listingId}}/publish
// POST {{baseUrl}}/api/moderation/ads/{{listingId}} (admin Bearer)
// GET  {{baseUrl}}/api/ads/{{listingId}} (now visible)
// Use separate actor tokens: seller, buyer, moderator/admin.
```

**Why this code exists:** An API workflow is meaningful only if state captured in one request is used in the following step.

**Try it:** Run a clean sequence and add a negative case at each transition.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

## Verification checklist

- [ ] OTP replay and concurrent correct verify requests.
- [ ] Role/current-user checks and private 404.
- [ ] Listing state guards, public filters, and category reservations.
- [ ] Upload partial failure, Cleanup persistence and recovery.
- [ ] Favorite/thread/report uniqueness and message privacy.
- [ ] HTTP response plus database effect after every expected failure.

## Common mistakes

- Mocking all persistence and thereby missing index behavior.
- Testing only 200 paths.
- Using test images with fake bytes.
- Treating sandbox `EPERM` as proof of a logic defect.

## Practical assignment

Submit one ordered Postman collection run and design at least one automated test each for concurrency, privacy, provider failure and state transitions.

## Source files to inspect

- `postman/collection.json`
- `postman/environment.json`
- `tests/core.test.js`
- `src/app.js`
- `package.json`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
