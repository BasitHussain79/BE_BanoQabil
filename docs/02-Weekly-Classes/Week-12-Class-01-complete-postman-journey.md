# Week 12 · Class 01 — Complete Postman Journey

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Validate all modules as a real API client in correct order.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Capture ad ID, upload, publish, approve, then favorite/inquire/report/sell/delete.

## 3. Concepts covered

- Environment variables
- token/ID capture
- multipart
- positive/negative checks

## 4. Real-world example

Capture ad ID, upload, publish, approve, then favorite/inquire/report/sell/delete.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Health→accounts→admin→category→ad/media→staff→search→interactions→cleanup.

## 7. Database flow

All model types exercised except Cleanup without an induced destroy failure.

## 8. Files involved

- `postman/collection.json`
- `postman/environment.json`
- `.env`
- `scripts/promote-admin.js`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Import assets; reset vars/db; run in order; record first failed request; use real image and SMTP capture.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 9A. Guided annotated code lab

The following commented examples are aligned to the **documented behavior**, not copied from the unseen repository. Read each block carefully, then compare it with the matching module in your source. Treat unknown field names and integration wiring as items to verify. Code blocks are examples within this Markdown class, not proof that those exact identifiers occur in Project 01.

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

Stale vars, out-of-order, fake image content, leaking exported tokens. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Submit complete sequence with success and failure evidence.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Testing and Postman](../01-API-and-System-Topics/15-Testing-and-Postman.md)

[Return to course index](../README.md)
