# Engineering-Delivery-Flow

> **Portfolio status:** Initial Phase / Engineering Prototype — created to demonstrate applied engineering, digitalization and AI-assisted development concepts.

Engineering Delivery Flow is an OTS/MES engineering project workflow application. The current V22 product is a browser/PWA prototype; the approved target is a **real multi-user company application** with central persistence, company-email login and role-based authorization.

## Live demo

https://otsflow-ceo-demo.hatchable.site/

## Baseline and reconstruction status

- Official product baseline: **Hatchable V22**, deployed 13 September 2026.
- This public repository is a **public-safe V22 reconstruction**, not a byte-identical export of every deployed asset.
- The approved stage model, core role model, project/task/review/query lifecycle, PWA entry point, archive controls and reporting concepts are preserved.
- Personal/sample identifiers and confidential/customer content are intentionally excluded.
- The current live prototype stores working data in browser `localStorage`; that is not suitable for a shared production rollout.

## Approved OTS stages

1. Process Modelling
2. Process Integration
3. Startup Internal
4. HMI Development
5. MAT
6. DCS Workflow
7. DCS/ESD Integration
8. Internal preFAT Startup
9. FAT
10. SAT

The application also includes a configurable MES stage template.

## Roles

- Administrator
- Project Manager
- Team Lead
- Project Lead
- Technical Manager
- Engineer

The current public reconstruction uses a local demo role switcher. Production must replace this with company email authentication and server-enforced RBAC.

## Current workflow

```text
Administrator -> Add people / Project Manager
Project Manager -> Create OTS or MES project
Leads -> Plan stages, work packages and tasks
Engineer -> Update assigned work -> Ready for Review
Reviewer -> Approve / Rework
Project Manager or Administrator -> Finish project
Administrator -> Archive -> Restore or Permanently Delete
```

## PWA / mobile

The release strategy is **Install PWA / Scan QR**. No App Store or Google Play listing is required for the current phase.

- `app.html` is the mobile/PWA entry point.
- `manifest.webmanifest` enables standalone installation.
- `sw.js` caches first-party application files.
- The Administration page generates a QR code that opens the PWA URL.

## Production target

The production application should move from `localStorage` to a central database and server APIs, with company-email identity and server-side authorization. See `docs/PRODUCTION_ARCHITECTURE.md` and `docs/MIGRATION_PLAN.md`.

## External integrations in scope

- SharePoint / company network folders.
- Email notifications.
- Microsoft 365.
- Other approved company systems.

## Public-repository privacy

Do not commit real customer names, company IDs, email addresses, confidential folder paths, proprietary documents, credentials, or screenshots containing restricted project information.

## Run locally

```bash
python -m http.server 8080 --directory public
```

Open `http://localhost:8080`. Some optional QR/Excel capabilities use browser libraries loaded from public CDNs in this reconstruction.

## License

No open-source license has been selected yet. Choose and add a license before inviting external reuse or contributions.
