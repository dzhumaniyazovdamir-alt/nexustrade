# ADR-0004: Cookie authentication and tenant RBAC

## Status

Accepted

## Context

NexusTrade needs browser authentication, strict organization isolation and revocable long-lived sessions. Authorization must not depend on client state or JWT role claims that can become stale.

## Decision

- A short-lived access JWT and a rotating refresh JWT are stored in `httpOnly`, `SameSite=Lax` cookies. Production cookies are `Secure`.
- Only hashes of refresh tokens are persisted. Rotation consumes the previous token; reuse revokes the whole token family.
- State-changing cookie requests must have an allowed `Origin`.
- Tenant identity is an explicit `organizationId` route parameter. Every tenant operation loads the current membership from PostgreSQL.
- Membership roles are `owner`, `admin` and `member`. The last owner cannot be removed or demoted.
- Invitation tokens are random, single-use, expire, and are stored only as hashes.

## Consequences

The API remains stateless between access requests but refresh requires PostgreSQL. Role changes apply immediately because authorization reads membership state. Redis-backed sessions, SMTP delivery and fine-grained permissions are deferred.
