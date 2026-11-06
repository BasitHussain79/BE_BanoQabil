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

## Annotated implementation examples (read alongside the real source)

> **Important:** These are newly written, commented **teaching implementations based on the supplied README**, **not recovered source code**. The published site did not expose the repository source for verification. Do not paste every example into one source file: overlapping snippets such as schema declarations are meant to be studied individually, then reconciled with your codebase. Each snippet identifies its intended source path and explains the business rule it demonstrates.

### Allowlisted profile update and deactivation

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { User } from '../models/index.js';

export async function updateMe(userId, input) {
  // Never copy role, verified, active or password from req.body.
  const patch = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.city !== undefined) patch['profile.city'] = input.city;
  if (input.phone !== undefined) patch['profile.phone'] = input.phone;
  const updated = await User.findOneAndUpdate(
    { _id: userId, active: true, verified: true },
    { $set: patch }, { new: true, runValidators: true },
  );
  if (!updated) { const e = new Error('Not found'); e.status = 404; throw e; }
  return { id: updated.id, name: updated.name,
    email: updated.email, city: updated.profile?.city };
}

export async function deactivateMe(userId) {
  // Soft account deactivation; it is NOT GDPR-style permanent erasure.
  await User.updateOne({ _id: userId, active: true }, { $set: { active: false } });
  return { deactivated: true };
}
```

**Why this code exists:** Allowlisting prevents mass assignment. Deactivation invalidates future authenticated requests because auth reloads the User.

**Try it:** Send role=admin in profile PATCH; verify it is not updated. Deactivate then retry with the old token.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Verify old password before changing it

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import bcrypt from 'bcrypt';
import { User } from '../models/index.js';

export async function changeMyPassword(userId, oldPassword, newPassword) {
  const user = await User.findById(userId).select('+password');
  if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
    const e = new Error('Invalid credentials'); e.status = 401; throw e;
  }
  if (newPassword.length < 12 || newPassword.length > 72 ||
      Buffer.byteLength(newPassword) > 72) {
    const e = new Error('Invalid password'); e.status = 422; throw e;
  }
  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();
  // No token blacklist exists: old unexpired JWTs remain usable.
  return { changed: true };
}
```

**Why this code exists:** Checking the old password is reauthentication; password changes are not JWT revocation in the documented source.

**Try it:** Change password; show that a previously issued JWT still authenticates before its expiry.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Admin-only user changes cannot target the actor

**File illustrated:** `src/services/marketplace.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import { User } from '../models/index.js';

export async function adminUpdateUser(actorId, targetId, changes) {
  if (String(actorId) === String(targetId)) {
    const e = new Error('Cannot change own admin record'); e.status = 409; throw e;
  }
  const patch = {};
  // Only these two administrative fields are accepted.
  if (changes.role !== undefined) patch.role = changes.role;
  if (changes.active !== undefined) patch.active = changes.active;
  const user = await User.findByIdAndUpdate(targetId, { $set: patch },
    { new: true, runValidators: true });
  if (!user) { const e = new Error('Not found'); e.status = 404; throw e; }
  return { id: user.id, name: user.name, email: user.email,
    role: user.role, active: user.active };
}
```

**Why this code exists:** Route-level roles("admin") and service-level self restriction handle different threats.

**Try it:** Try assigning moderator to a second account, then try updating the current administrator.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

### Bootstrap a verified administrator

**File illustrated:** `scripts/promote-admin.js` · **Status:** annotated reference example, **not a verbatim extract** from the unavailable repository.

```javascript
import mongoose from 'mongoose';
import { User } from '../src/models/index.js';

// Run after connecting to MongoDB and loading validated environment secrets.
export async function promoteVerified(email) {
  const account = await User.findOneAndUpdate(
    { email: email.trim().toLowerCase(), active: true, verified: true },
    { $set: { role: 'admin' } }, { new: true },
  );
  if (!account) throw new Error('No active verified account found');
  console.log('Verified administrator promoted'); // never log credentials
  return { id: account.id, role: account.role };
}
// This is a bootstrap helper, not a public API route.
```

**Why this code exists:** The administrator cannot be bootstrapped through unprotected signup payload fields.

**Try it:** Verify an account first; reject promotion of a pending/unverified account.

**Before using in production:** Compare model property names, imports, validation, error types, and route signatures against the real Project 01 source. This excerpt teaches the documented invariant; it may omit neighboring middleware or application wiring.

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
