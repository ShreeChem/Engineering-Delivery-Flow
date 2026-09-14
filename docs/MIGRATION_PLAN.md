# Prototype-to-Production Migration Plan

## Phase 1 — Freeze and test V22 behavior

- Keep V22 as the UX/workflow reference.
- Build a fresh-workspace automated lifecycle test.
- Verify: add PM -> create project -> assign engineer -> create task -> submit -> review -> complete -> finish -> archive -> restore -> permanent delete.
- Confirm final permission matrix.

## Phase 2 — Central data model

- Define relational schema for users, projects, stages, tasks, reviews, queries and audit events.
- Add API contracts.
- Migrate local workflow calculations to testable service functions.
- Remove `localStorage` as the system of record; retain it only for harmless UI preferences/offline drafts if needed.

## Phase 3 — Authentication and RBAC

- Add company-email login / enterprise SSO.
- Map authenticated identities to company roles.
- Enforce project membership and action permissions on the server.
- Remove demo role impersonation from production builds.

## Phase 4 — Integrations

- SharePoint/company network-folder links.
- Microsoft 365 integration.
- Email notification service.
- Optional approved company systems.

## Phase 5 — PWA production hardening

- Offline policy and conflict behavior.
- Update strategy/version prompts.
- Installability tests on iOS/Android/desktop.
- Smart QR to canonical PWA URL.
- Device and accessibility testing.

## Phase 6 — Governance

- Backup/restore strategy.
- Data retention and deletion policies.
- Audit retention.
- Security review and penetration testing.
- Monitoring, logging and incident response.
