# Architecture and Dependency Injection

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

Routes/validators/middleware plus thin controllers and service-owned business logic, organized around a testable app factory.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Root health route; not inside /api |
| `ALL` | `/api/*` | Varies | Route → validator → auth/role → respond → service → Mongoose/provider |

## How the implementation works

1. `src/server.js` loads config, connects Mongoose, listens, and handles process shutdown.
2. `src/app.js` exposes `createApp(dependencies)` so app can run in tests without opening a listener.
3. Global middleware limits request volume, parses bounded JSON and handles errors.
4. Routes compose verbs, paths, validators, auth, roles, and HTTP adapter.
5. `respond` normalizes service success into the `data` envelope.
6. Services enforce business invariants; Mongoose models persist data.
7. Email/Cloudinary/clock dependencies are provided by adapters or fakes.
8. Error middleware runs last and redacts unknown failures.

## Invariants and exact boundaries

- Node >=24 <25; Express 5.1; ESM.
- Connection occurs before listening; graceful shutdown closes HTTP and MongoDB (README notes a ten-second bound).
- Business rules belong in services, not routes.
- CreateApp is testable without opening an external network port.

## Database responsibilities

- Models centralize schemas/indexes.
- Services own state; external providers isolated behind injected adapters.

## Request or design example

```text
HTTP client
  -> Express app
  -> route + validators + authorization
  -> respond adapter
  -> service business rules
  -> Mongoose / SMTP adapter / Cloudinary adapter
  -> safe response
```

**Illustrative call structure only;** inspect `src/app.js` and route files for actual function names/argument shapes.

## Verification checklist

- [ ] Trace `/health`, unknown route and validation failure through middleware.
- [ ] Inject fake email/image/clock in createApp and verify no network provider is used.
- [ ] Verify Express 5 async error forwarding and central mapping.
- [ ] Stop process and confirm graceful close/disconnect.

## Common mistakes

- Putting persistence/business rules directly in Express route handlers.
- Opening the HTTP listener when importing app in tests.
- Using the provider SDK directly throughout services.
- Treating `/health` as a readiness probe for every dependency.

## Practical assignment

Trace one successful, one unauthorized and one failed-provider request across each layer. Explain why the app factory and dependency injection make failure testing possible.

## Source files to inspect

- `src/app.js`
- `src/server.js`
- `src/controllers/http.js`
- `src/routes/`
- `src/config/`
- `src/services/`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
