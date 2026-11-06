# Architecture Overview

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Core component graph

```mermaid
flowchart LR
    Client[Postman / HTTP client] --> App[Express createApp]
    App --> Routes[Routes + validators]
    Routes --> Auth[JWT + current User role]
    Routes --> Respond[HTTP respond adapter]
    Respond --> Services[Auth / Marketplace / Image services]
    Services --> DB[(MongoDB via Mongoose)]
    Services --> SMTP[Injected SMTP adapter]
    Services --> Cloud[Injected Cloudinary adapter]
    Tests[Supertest] --> App
    Fakes[Fake clock / SMTP / Cloudinary] --> Services
```

## Layer ownership

| Layer | Responsibility | Avoid |
|---|---|---|
| `server.js` | Connect DB, bind listener, graceful shutdown | Business logic |
| `app.js` | Register middleware, routes, error handling | Opening listener during test import |
| `routes/` | Method/path and policy composition | Raw persistence logic |
| `validators/` | Normalize/limit external input | Authorizing by client-supplied role |
| `middleware/auth.js` | Verify token, load current User, check role | Trusting stale token role claims |
| `controllers/http.js` | Adapt service results to `{data: ...}` | Domain state transitions |
| `services/` | Invariants, scoped reads, conditional writes, compensation | HTTP transport details everywhere |
| `models/` | Schemas, refs, indexes, concurrency | Replacing service authorization |
| provider adapters | SMTP/Cloudinary SDK integration | Tangling provider credentials with controllers |
| final errors | Stable safe `{error: ...}` | Leaking raw provider errors |

## Marketplace state machine

```mermaid
stateDiagram-v2
    [*] --> draft: create
    draft --> pending: publish + image
    pending --> published: staff approve
    pending --> draft: staff reject
    published --> pending: owner edits
    published --> sold: mark sold
    draft --> archived: soft delete
    pending --> archived: soft delete
    published --> archived: soft delete
    sold --> archived: soft delete
```

See [Database](../01-API-and-System-Topics/14-Database-Models-and-Indexes.md), [Listings](../01-API-and-System-Topics/04-Ads-and-Listing-Lifecycle.md), and [RBAC](../01-API-and-System-Topics/11-Security-RBAC-and-Ownership.md).
