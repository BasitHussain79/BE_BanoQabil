# Week 11 · Class 01 — Application Security Controls

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

**Course:** OLX Clone Marketplace API  |  **Track:** Node.js · Express 5 · MongoDB · Mongoose

## 1. Overview

Identify layered controls and realistic threat boundaries.

## 2. Why this topic matters

This class strengthens the behavior of the *implemented* marketplace, not an imaginary frontend/checkout. Students must connect what clients send to what the server actually permits and stores. Malformed body with password should be rejected without echoing sensitive text.

## 3. Concepts covered

- App/auth limits
- bcrypt/HMAC/JWT
- allowlists
- upload signatures
- resource privacy

## 4. Real-world example

Malformed body with password should be rejected without echoing sensitive text.

## 5. Architecture explanation

Locate the HTTP entry point, validator, authentication/role middleware where applicable, service business rule, schema/index, and any provider adapter. Do not assume controllers enforce policy merely because they return a successful JSON response. See the companion topic documentation below.

## 6. Request flow

Limit→parse→validate→authenticate→authorize→invariant→safe output.

## 7. Database flow

Indexes/conditional writes complement request-time validation.

## 8. Files involved

- `src/app.js`
- `src/middleware`
- `src/validators`
- `src/services/auth.js`
- `src/services/images.js`

## 9. Step-by-step implementation lab

1. Read the referenced modules and locate the exact request path(s) in routes and Postman.
2. Identify the allowed input fields, relevant authenticated identity, and documented state prerequisite.
3. Follow the request into the service, then record any model/index/provider effects.
4. Execute the focused lab: Threat matrix for brute OTP, token forgery, role escalation, fake uploads, regex and large JSON.
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

Trust-all proxies, CORS as authorization, process-local limit as distributed limit. Add a negative request that demonstrates the correct defense.

## 13. Assignment

Submit prioritized threat matrix and production gaps.

**Evidence required:** endpoint/method, request inputs without live secrets, expected vs observed status, saved database result, and a concise explanation of the rule.

## 14. Learning outcomes / exit criteria

- Explain the topic without confusing API personas with persisted roles.
- Trace one successful and one denied request from HTTP to durable state.
- Describe at least one realistic edge case, concurrency risk, or external-provider limitation.
- Complete the assignment and show reproducible evidence.

## Companion topic guides

- [Security, RBAC, Ownership and Privacy](../01-API-and-System-Topics/11-Security-RBAC-and-Ownership.md)
- [Validation and Operational Limits](../01-API-and-System-Topics/12-Validation-and-Operational-Limits.md)

[Return to course index](../README.md)
