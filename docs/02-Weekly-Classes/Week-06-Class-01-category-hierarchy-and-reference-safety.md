# Week 06 · Class 01 — Category Hierarchy and Reference Safety

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Protect one-level taxonomy against conflicting deletes and creations.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Vehicles→Cars allowed; Cars→Sedans third-level not supported.

## 3. Concepts covered

- Slugs
- active state
- child/reference counters
- compensation

## 4. Real-world example

Vehicles→Cars allowed; Cars→Sedans third-level not supported.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Reserve parent child counter→insert child; Listing reserve ref→insert; zero-counter conditional delete.

## 7. Database flow

Category counters + unique slug/name-parent indexes.

## 8. Files involved

- `src/models/index.js`
- `src/services/marketplace.js`
- `src/routes`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Create root/child, reject third level/duplicate, test in-use delete, archive ad then delete.
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

Precheck-then-delete race, resetting counters live. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Show both safety conflict and compensating release behavior.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Categories](../01-API-and-System-Topics/03-Categories.md)
- [Database Models and Indexes](../01-API-and-System-Topics/14-Database-Models-and-Indexes.md)

[Return to course index](../README.md)
