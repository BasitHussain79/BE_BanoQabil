# Profiles and Users

> **Source basis:** Instructor-provided Project 01 README. The public page was checked, but the application source files and tests could not be independently inspected. Implementation details listed here reflect the README; any example not described in the README is explicitly illustrative.

## Goal

Self-service profile/account lifecycle plus admin-only user listing and user role/status management.

## Implemented endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/users/me` | Authenticated | Return safe profile |
| `PATCH` | `/api/users/me` | Authenticated | Change name and optional city/phone |
| `PATCH` | `/api/users/me/password` | Authenticated | Confirm current password and change it |
| `DELETE` | `/api/users/me` | Authenticated | Deactivate own account |
| `GET` | `/api/users` | Admin | Paginated public-user projections |
| `PATCH` | `/api/users/:id` | Admin | Change another user role and active flag |

## How the implementation works

1. Authenticate current active, verified user for /me routes.
2. Serialize only explicitly allowed profile fields; do not return password, OTP state, or secrets.
3. Profile PATCH selects allowed name/city/phone fields rather than spreading the request body.
4. Password change fetches hidden old hash, compares old password, and stores a bcrypt hash of the validated new password.
5. Self-deactivation changes active to false, so the next protected request returns 401.
6. Admin bootstrap is done with npm run admin -- verified-user@example.test after verification.
7. Admin list is paginated; user modification targets another user, not the requesting administrator.

## Invariants and exact boundaries

- Persisted roles are `user`, `moderator`, `admin`; buyer/seller are personas, not roles.
- Authenticated access reloads current role/status every request.
- Admin cannot use user-management endpoint to modify themselves.
- Changing password or logging out does NOT revoke previously issued tokens.
- Deactivation is not irreversible erasure; retention/privacy work is a future production gap.

## Database responsibilities

- User; `password` hidden by default; publicUser allowlists outgoing response.

## Request or design example

```http
GET /api/users/me
Authorization: Bearer <access-token>
```

```http
PATCH /api/users/me
Authorization: Bearer <access-token>
Content-Type: application/json

{"name":"Aisha Khan","city":"Karachi"}
```

For `/api/users/:id`, confirm the precise role/status request body in the source validator or Postman collection before sending it.

## Verification checklist

- [ ] PATCH with role, verified, and password fields must not allow privilege changes.
- [ ] Wrong old password vs correct password change.
- [ ] Immediately retry authenticated request after deactivation.
- [ ] Admin paginates safely and changes another user role/status.
- [ ] Admin self-change rejected and ordinary users denied admin endpoints.

## Common mistakes

- `Object.assign(user, req.body)` mass assignment.
- Treating password change as token revocation.
- Returning raw Mongoose User with hidden fields selected.
- Assuming buyer and seller correspond to separate User.role values.

## Practical assignment

Using two accounts and a promoted admin, show safe profile output, one valid profile update, rejected mass assignment, password reauthentication, admin target update, self-edit restriction, and the effect of deactivation.

## Source files to inspect

- `scripts/promote-admin.js`
- `src/services/marketplace.js`
- `src/middleware/auth.js`
- `src/models/index.js`
- `src/routes/`

## Cross-reference

See [documentation index](../README.md), [project review](../00-Start-Here/01-Project-Review.md), and [API inventory](../03-Reference/01-Complete-API-Inventory.md).
