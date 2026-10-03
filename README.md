# Engineering-Delivery-Flow

A public-safe engineering workflow prototype for OTS/MES project delivery, built as a browser-based PWA and designed to demonstrate project control, stage tracking, earned-value logic, review flow, punch items, queries, and reporting.

## Overview

Engineering Delivery Flow models the core delivery workflow used in OTS/MES engineering projects:

- project creation and role-based views
- stage planning and progress tracking
- task assignment and review workflow
- punch list / action tracking
- customer data requests and queries
- weekly report generation and status reporting
- progress/RAG logic for schedule, hours, and quality

This repository is a public-safe reconstruction of a V22 product baseline, intended for portfolio/demo purposes and engineering prototype review rather than production deployment.

## Current status

- Demo prototype status: active
- Architecture: static browser/PWA app
- Persistence: browser localStorage (prototype only)
- Production target: central database + server-side authorization + company SSO

## Live demo

https://otsflow-ceo-demo.hatchable.site/

## Run locally

```bash
python -m http.server 8080 --directory public
```

Then open: http://localhost:8080

## Important note

This repository is intentionally public-safe and does not include customer data, confidential project details, or production credentials. It is intended to demonstrate workflow logic, interface structure, and project execution thinking.

## Folder structure

- `public/` — PWA frontend
- `api/` — backend/API notes and architecture guidance
- `docs/` — process rules, architecture, roadmap, permissions, migration notes

## License

No license has been selected yet. Add one before external reuse or contribution.
