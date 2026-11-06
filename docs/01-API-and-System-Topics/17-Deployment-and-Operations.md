# Deployment and Operations

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

A readiness review separating locally tested production-oriented code from infrastructure controls that are not implemented.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Process liveness only |
| `POST` | `/api/moderation/cleanup` | Admin | Manual recovery, not background worker |

## How the implementation works

1. Confirm startup env validation with distinct 32-character-plus secrets.
2. Define TLS ingress and exact reverse-proxy trust boundaries.
3. Set an explicit browser CORS policy where needed; do not confuse CORS with authentication.
4. Replace process-local rate maps with a shared atomic store before horizontal scaling.
5. Define durable email/cleanup workers and asset/category-counter reconciliation.
6. Configure backups, restore drills, structured logs, alerts, metrics, traces and SLOs.
7. Establish privacy retention/deletion, security incident response, rotation and provider retry policies.
8. Verify availability and data recovery in a staging environment before a production-readiness claim.

## Invariants and exact boundaries

- Docker, CI/CD, deployment pipeline, monitoring infrastructure and background durable workers are NOT implemented.
- Multi-replica servers have independent memory rate limits.
- JWT logout/password-change revocation is not implemented.
- Cloudinary crash orphans require reconciliation beyond normal compensation.
- Live readiness is different from `/health` process liveness.

## Database responsibilities

- MongoDB backup/restore and indexes.
- Cleanup operational queue and Category reference counters need reconciliation strategy.

## Request or design example

```text
TLS ingress / exact proxy
   -> API replica(s) -> MongoDB
                    -> SMTP / Cloudinary
   -> shared rate-limit store (future)
   -> background workers (future)
   -> observability / backup services (future)
```

Everything tagged **future** is a gap to plan, not functionality already present.

## Annotated implementation examples (read alongside the real source)

> **Important:** These are newly written, commented **teaching implementations based on the supplied README**, **not recovered source code**. The published site did not expose the repository source for verification. Do not paste every example into one source file: overlapping snippets such as schema declarations are meant to be studied individually, then reconciled with your codebase. Each snippet identifies its intended source path and explains the business rule it demonstrates.

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

### Educational in-process sliding window

**File illustrated:** `src/middleware/limits.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
export function localWindowLimit({ max, windowMs = 60_000, now = () => Date.now() }) {
  const store = new Map(); // local to ONE Node process, not distributed
  return (req, res, next) => {
    const ip = req.ip; // configure trust proxy EXACTLY for your ingress
    const bucket = store.get(ip);
    const current = now();
    const entry = !bucket || current - bucket.started >= windowMs
      ? { started: current, count: 0 } : bucket;
    entry.count += 1;
    store.set(ip, entry);
    if (entry.count > max) return res.status(429).json({ error: 'Too many requests' });
    next();
  };
}
// Example wiring: app.use(localWindowLimit({ max: 300 }));
// Auth routes additionally use localWindowLimit({ max: 30 }).
// Educational example: implement eviction and shared atomic limits in production.
```

**Why this code exists:** In-memory maps have different counts per process and need cleanup; they are NOT a cluster-wide defense.

**Try it:** Explain behavior with two replicas and why shared storage and correct proxy config are needed.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Production readiness evidence checklist

**File illustrated:** `docs/production-readiness.md` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```markdown
# Proposed operational checklist — NOT implemented production infrastructure
# [ ] TLS terminates at a trusted ingress; proxy trust matches exact hops.
# [ ] CORS allows intended application origins, not wildcard credentials.
# [ ] JWT/OTP secrets are managed, rotated and never logged.
# [ ] App/auth rate limits use shared atomic storage across replicas.
# [ ] Email, image cleanup and reconciliation use durable jobs.
# [ ] Backups are automated AND sample restores have been tested.
# [ ] Metrics/alerts cover 5xx rate, latency, SMTP/Cloudinary failures.
# [ ] Retention, deletion requests and access audit policies are approved.
# [ ] Token renewal/revocation is deliberately designed if required.
```

**Why this code exists:** This is a proposed extension; the README explicitly says shared limits, monitoring and deployment pipeline are not implemented.

**Try it:** Mark each item Not started / Designed / Verified and attach evidence instead of checking boxes without proof.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

## Verification checklist

- [ ] Kill process during upload to study orphan risk.
- [ ] Verify restore from backups and cleanup retry behavior.
- [ ] Test exact proxy behavior/IP ownership at ingress.
- [ ] Validate shared limiter under multiple replicas.
- [ ] Rehearse SMTP/Cloudinary outage and recovery; verify no secret exposure.

## Common mistakes

- Labeling the source as fully deployed/production complete.
- Using wildcard CORS or trust-all proxy configuration by default.
- Ignoring durable queues or backups.
- Assuming cleanup table alone automatically removes crash-created orphan assets.

## Practical assignment

Produce readiness scorecard with item, owner, severity, evidence, acceptance criterion, and date. Include JWT revocation choices, uploads reconciliation, shared limits, backups, monitoring and retention.

## Source files to inspect

- `.env.example`
- `src/server.js`
- `src/app.js`
- `src/config/`
- `src/middleware/`
- `README.md`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
