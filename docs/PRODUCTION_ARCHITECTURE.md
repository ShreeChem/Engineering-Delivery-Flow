# Target Production Architecture

```text
Users (web / installed PWA)
          |
          v
Company email authentication / SSO
          |
          v
Server-side authorization (RBAC)
          |
          v
Application API
          |
   +------+---------------------------+
   |      |             |             |
   v      v             v             v
Projects Tasks      Queries       Audit / notifications
   |      |             |             |
   +------+-------------+-------------+
          |
          v
Central relational database
          |
   +------+-----------------------------+
   |              |                     |
   v              v                     v
SharePoint     Microsoft 365       Email / other
links/files    integration          approved systems
```

## Identity and authorization

Production requirements:

- Company-email sign-in or enterprise SSO.
- Server-enforced role membership; never trust a browser role selector.
- Project-level membership checks.
- Administrator-only archive/permanent-delete operations.
- Reviewer authorization enforced by the API.
- Audit events stored centrally and append-only where practical.

## Core data entities

Recommended normalized entities:

- users
- roles / user_roles
- projects
- project_members
- stages
- work_packages
- tasks
- task_reviews
- date_change_requests
- queries_issues
- comments
- archived_projects / project lifecycle events
- audit_events
- notifications
- integration_links

## File strategy

The application should not become an uncontrolled document repository. Store canonical SharePoint/company-folder links and metadata; use approved Microsoft 365 APIs when direct file actions are required.
