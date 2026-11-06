# Week 01 · Class 02 — Project Setup and Server Lifecycle

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Reproduce the runtime with pinned packages and clear app/listener separation.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. A process shutdown closes HTTP, then disconnects Mongoose within a bounded period.

## 3. Concepts covered

- Node 24 ESM
- npm ci
- env
- health
- Mongo startup
- SIGTERM

## 4. Real-world example

A process shutdown closes HTTP, then disconnects Mongoose within a bounded period.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Load environment→connect Mongo→listen→health check→shutdown.

## 7. Database flow

Database must connect before the HTTP listener begins; health is not deep readiness.

## 8. Files involved

- `package.json`
- `.env.example`
- `src/config`
- `src/app.js`
- `src/server.js`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Check node -v; npm ci; copy env; create distinct secrets; start Mongo/Mailpit; start API; curl /health; test 404 and graceful stop.
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

Running npm init instead of npm ci, reusing secrets, assuming health checks Mongo. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Capture clean startup, /health, 404, and invalid-secret startup evidence.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Architecture and Dependency Injection](../01-API-and-System-Topics/16-Architecture-and-Dependency-Injection.md)
- [Health and Authentication](../01-API-and-System-Topics/01-Health-and-Authentication.md)

[Return to course index](../README.md)
