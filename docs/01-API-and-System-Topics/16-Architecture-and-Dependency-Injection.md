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

## Annotated implementation examples (read alongside the real source)

> **Important:** These are newly written, commented **teaching implementations based on the supplied README**, **not recovered source code**. The published site did not expose the repository source for verification. Do not paste every example into one source file: overlapping snippets such as schema declarations are meant to be studied individually, then reconciled with your codebase. Each snippet identifies its intended source path and explains the business rule it demonstrates.

### Keep controller response translation thin

**File illustrated:** `src/controllers/http.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
// Express 5 forwards rejected async handler promises to error middleware.
export const respond = (action, successStatus = 200) => async (req, res) => {
  const result = await action(req); // service owns business decisions
  return res.status(successStatus).json({ data: result });
};

// Example route composition (reference wiring):
// router.post('/ads', requireAuth, validateCreateAd,
//   respond((req) => services.createDraft(req.user.id, req.body), 201));
// The service must pick allowed fields; never persist req.body wholesale.
```

**Why this code exists:** Controller has one job: translate a service result into the established JSON envelope.

**Try it:** Trace how an AppError becomes an error response through Express 5 middleware.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Wire routes, middleware and provider dependencies

**File illustrated:** `src/app.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import express from 'express';
import { errorHandler } from './middleware/errors.js';

export function createApp({ authRoutes, marketplaceRoutes }) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/health', (_req, res) => res.json({ status: 'OK', uptime: process.uptime() }));
  app.use(express.json({ limit: '32kb' }));
  // Providers/services are assembled outside and passed into the route factories.
  app.use('/api/auth', authRoutes);
  app.use('/api', marketplaceRoutes);
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler); // always AFTER routes and 404 handler
  return app; // no .listen(), so Supertest can reuse it
}
```

**Why this code exists:** createApp constructs the HTTP app without owning the network listener.

**Try it:** Pass fake mailer/image adapters into your route factory, then test with Supertest.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Connect DB before listening and shut down gracefully

**File illustrated:** `src/server.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import mongoose from 'mongoose';
import { createApp } from './app.js';

export async function start({ mongoUri, port, routes }) {
  await mongoose.connect(mongoUri); // fail fast before accepting requests
  const server = createApp(routes).listen(port);
  let stopping = false;
  async function shutdown(signal) {
    if (stopping) return;
    stopping = true;
    const hardStop = setTimeout(() => process.exit(1), 10_000);
    hardStop.unref(); // do not keep process alive just for this timeout
    server.close(async (error) => {
      try { await mongoose.disconnect(); }
      finally { clearTimeout(hardStop); process.exit(error ? 1 : 0); }
    });
  }
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  return server;
}
```

**Why this code exists:** The network listener is separate from app composition, and shutdown has a bounded deadline.

**Try it:** Send SIGTERM during an idle process; check listener closes before Mongoose disconnect.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

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
