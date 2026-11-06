# Capstone and Grading

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

A defensible demonstration of the complete marketplace API, security invariants, provider failure handling and the production gap review.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `ALL` | `Relevant implemented routes` | Varies | Composed business demonstration |

## How the implementation works

1. Present the component architecture and scope boundaries; distinguish user persona and persisted role.
2. Signup, capture verification email, consume OTP, log in and demonstrate profile.
3. Promote verified admin, manage one user, and create category.
4. Create owned draft, upload validated image, publish, moderate and discover it publicly.
5. Exercise search/filter/sort/page, favorite, and private inquiry both ways.
6. Report ad, resolve, mark sold and soft delete.
7. Show deliberate OTP replay, role, owner, transition, upload and participant denials.
8. Run tests including races and provider compensation; present readiness gaps.

## Invariants and exact boundaries

- Functional journey 25%; architecture 20%; security 20%; reliability/testing 20%; operations/communication 15%.
- Postman is the client; no implemented React dashboard.
- Purchase inquiry is a stored message, not a checkout/payment.
- Show evidence for denied paths, not just success statuses.

## Database responsibilities

- Explain all eight models and why unique/conditional/versioned writes protect invariants.

## Request or design example

```text
Demo sequence:
health → signup → OTP → login → admin → category → draft
→ image → publish → approve → search → favorite → inquiry
→ report → resolve → sold → soft delete → negative cases → tests
```

## Annotated implementation examples (read alongside the real source)

> **Important:** These are newly written, commented **teaching implementations based on the supplied README**, **not recovered source code**. The published site did not expose the repository source for verification. Do not paste every example into one source file: overlapping snippets such as schema declarations are meant to be studied individually, then reconciled with your codebase. Each snippet identifies its intended source path and explains the business rule it demonstrates.

### Define a measurable end-to-end verification matrix

**File illustrated:** `tests/capstone.scenarios.md` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
// Pseudocode for your capstone test plan (not an executable test file).
// GIVEN admin, moderator, seller, buyer and unrelated user
// WHEN seller creates a draft with status='published' in request body
// THEN saved status MUST be 'draft', public GET MUST be 404.
// WHEN seller uploads JPEG and requests publish
// THEN state MUST be pending; moderator can approve exactly once.
// WHEN buyer favorites and opens inquiry twice
// THEN one Favorite and one Conversation MUST exist.
// WHEN unrelated user requests thread messages
// THEN return private 404, never thread metadata.
// WHEN staged Cloudinary upload/destroy fails
// THEN persist Cleanup job and retry it via admin operation.
// WHEN admin is demoted while an old JWT exists
// THEN the next admin request MUST return 403.
```

**Why this code exists:** The final demonstration should exercise denied states and persisted effects, not just happy-path responses.

**Try it:** Turn every GIVEN/WHEN/THEN row into a Postman check or automated integration test.

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

## Verification checklist

- [ ] Rubric covers all declared flows.
- [ ] Each negative demo records status AND saved state.
- [ ] A flaky external SMTP/Cloudinary demonstration has an injected-fake fallback for integration tests.
- [ ] Capstone clearly lists unimplemented frontend, payments, real-time and deployment features.

## Common mistakes

- Presenting this as complete MERN frontend application.
- Ignoring private 404 and provider-recovery demonstrations.
- Skipping tests in favor of a happy-path-only walkthrough.

## Practical assignment

Deliver API demo, README-based architecture diagram, access/transition matrix, automated test evidence, production-gap review, and a five-minute technical defense.

## Source files to inspect

- Entire `src/` tree
- `tests/core.test.js`
- Postman assets
- `.env.example`
- `package.json`
- `README.md`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
