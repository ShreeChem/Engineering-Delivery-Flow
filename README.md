# Engineering-Delivery-Flow

> **Portfolio status:** Initial Phase / Engineering Prototype — created to demonstrate applied engineering, digitalization and AI-assisted development concepts.

Engineering Delivery Flow is an OTS/MES engineering project workflow application. The current V24 product is a browser/PWA prototype; the approved target is a **real multi-user company application** with central persistence, company-email login and role-based authorization.

## Live demo

https://shreechem.github.io/Engineering-Delivery-Flow/ (GitHub Pages, deployed automatically from `main`, always the latest version)

PWA entry point: https://shreechem.github.io/Engineering-Delivery-Flow/app.html

Earlier host: https://otsflow-ceo-demo.hatchable.site/ (may show an older version).

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

## Roles (V24)

| Role | Added by | Sees |
|---|---|---|
| Administrator | — (built in) | All projects, people, archive, settings, demo data |
| Project Manager | Administrator | Own projects: baseline, SPI/CPI, 3 RAG lights, S-curve, hours, weekly report, publishing |
| Lead | Administrator | Team workload, reviews, blockers, punch list, quantities |
| Engineer | PM or Lead | Own tasks, hours and quantities, punch items assigned to them |
| Main Contractor | PM or Lead | Progress vs baseline, milestones (baseline/forecast/slip), punch list, quantities, data requests, shared queries, published reports |
| Plant Owner | PM or Lead | Progress, milestones, punch counts, data it owes, queries shared with both customers, published reports |

Customers never see hours, budget, CPI, internal risks, decisions, internal queries or internal notes. Full matrix: `docs/ROLE_VISIBILITY.md`. Calculations and thresholds: `docs/PROGRESS_RULES.md`.

Key V24 features: **Approve baseline** (re-baselining needs a reason and is logged), earned value in hours (SPI, CPI, forecast hours), **three RAG lights** (schedule, hours/budget, quality/scope), **weekly snapshots**, a **weekly report** for four audiences (copy as e-mail, print/PDF, publish a frozen copy to customers), **OTS quantities** (units modelled, I/O tags emulated, scenarios built, HMI graphics), **punch list** A/B/C per gate, **customer data requests**, and an **OTS | MES** switch.

A fresh workspace contains only the Administrator. **Load demo** (Admin › Settings) adds 1 OTS and 1 MES project with demo people; **Remove demo data** deletes only demo items. V23 data on the same device is migrated automatically (Customer → Main Contractor).

## Current workflow

```text
Administrator -> Add Project Manager and Lead
Project Manager -> Create OTS or MES project
PM / Lead -> Add Engineers, Main Contractor and Plant Owner; plan stages, tasks and quantities
Project Manager -> Approve baseline
Customers -> Answer data requests and queries; Main Contractor raises and closes punch items
Engineer -> Update hours/status -> Ready for Review
Assigned reviewer (never the assignee) -> Approve (only route to Completed) / Rework
Project Manager -> Write and publish the weekly report
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
