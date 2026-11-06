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
