# Data Flow

## Current prototype

```text
People / projects / tasks / queries entered in UI
                    |
                    v
           Browser workflow logic
                    |
                    v
             localStorage JSON
                    |
        +-----------+-----------+
        |                       |
        v                       v
 dashboards / stages       reports / backup
```

## Production target

```text
Authenticated user action
        |
        v
API authorization + validation
        |
        v
central transaction / audit event
        |
        +--> relational database
        +--> notification service
        +--> optional Microsoft 365 / SharePoint integration
        |
        v
updated role-filtered UI on all devices
```
