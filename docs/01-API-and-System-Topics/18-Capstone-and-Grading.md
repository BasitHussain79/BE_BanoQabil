# Capstone and Grading

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

A defensible demonstration of the complete marketplace API, security invariants, provider failure handling and the production gap review.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `ALL` | `Relevant implemented routes` | Varies | Composed business demonstration |

## How the implementation works

1. Present the component architecture and scope boundaries; distinguish user persona and persisted role.
2. Signup, capture verification email, consume OTP, log in and demonstrate profile.
3. Promote verified admin, manage one user, and create category.
4. Create owned draft, upload validated image, publish, moderate and discover it publicly.
5. Exercise search/filter/sort/page, favorite, and private inquiry both ways.
6. Report ad, resolve, mark sold and soft delete.
7. Show deliberate OTP replay, role, owner, transition, upload and participant denials.
8. Run tests including races and provider compensation; present readiness gaps.

## Invariants and exact boundaries

- Functional journey 25%; architecture 20%; security 20%; reliability/testing 20%; operations/communication 15%.
- Postman is the client; no implemented React dashboard.
- Purchase inquiry is a stored message, not a checkout/payment.
- Show evidence for denied paths, not just success statuses.

## Database responsibilities

- Explain all eight models and why unique/conditional/versioned writes protect invariants.

## Request or design example

```text
Demo sequence:
health → signup → OTP → login → admin → category → draft
→ image → publish → approve → search → favorite → inquiry
→ report → resolve → sold → soft delete → negative cases → tests
```

## Verification checklist

- [ ] Rubric covers all declared flows.
- [ ] Each negative demo records status AND saved state.
- [ ] A flaky external SMTP/Cloudinary demonstration has an injected-fake fallback for integration tests.
- [ ] Capstone clearly lists unimplemented frontend, payments, real-time and deployment features.

## Common mistakes

- Presenting this as complete MERN frontend application.
- Ignoring private 404 and provider-recovery demonstrations.
- Skipping tests in favor of a happy-path-only walkthrough.

## Practical assignment

Deliver API demo, README-based architecture diagram, access/transition matrix, automated test evidence, production-gap review, and a five-minute technical defense.

## Source files to inspect

- Entire `src/` tree
- `tests/core.test.js`
- Postman assets
- `.env.example`
- `package.json`
- `README.md`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
