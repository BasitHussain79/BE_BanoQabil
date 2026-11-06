# Week 01 · Class 01 — Marketplace Domain and API Walkthrough

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Distinguish marketplace buyer/seller personas from persisted access roles.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. One account owns a phone ad and asks about another user’s bicycle.

## 3. Concepts covered

- Personas
- public/private resources
- trust
- moderation
- REST resources

## 4. Real-world example

One account owns a phone ad and asks about another user’s bicycle.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Map signup→verify→login→draft/image→approval→favorite/inquiry/report.

## 7. Database flow

Connect journey stages to User, Category, Listing, Favorite, Conversation, Message, Report, Cleanup.

## 8. Files involved

- `README.md`
- `src/routes/index.js`
- `src/models/index.js`
- `postman/collection.json`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Classify every route public, authenticated, owner, participant, moderator or admin; draw persona flows; flag missing payments/UI.
5. Run a valid case and at least two invalid cases. Capture **HTTP status**, safe response shape, **database state**, and provider effects if any.
6. State which validation or authorization boundary prevented an invalid transition; add a regression test when feasible.

## 10. Code explanation / tracing exercise

Write a five-column trace table: **route** | **validator/middleware** | **service rule** | **database/provider operation** | **public response**. Fill it from the actual source, not from assumed Express scaffolding. If a source snippet is absent, leave its exact identifier as `verify in source`.

## 11. Best practices

- Keep user-controlled input distinct from server-derived identity, role, owner, participant, and status.
- Use bounded validation and purpose-built queries rather than forwarding raw request objects to the database.
- Test persistent state, not just the HTTP status.
- Explain omitted features accurately: no React dashboard, payments, WebSockets, or deployed infrastructure in this project.

## 12. Common mistakes

Treating seller as an admin-like role or claiming checkout exists. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Submit a persona swimlane with at least twelve endpoints and their models.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Health and Authentication](../01-API-and-System-Topics/01-Health-and-Authentication.md)
- [Ads and Listing Lifecycle](../01-API-and-System-Topics/04-Ads-and-Listing-Lifecycle.md)
- [Security, RBAC, Ownership and Privacy](../01-API-and-System-Topics/11-Security-RBAC-and-Ownership.md)

[Return to course index](../README.md)
