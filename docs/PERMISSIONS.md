# Permission Model

This is the intended business model inferred from the approved V22 workflow. Production authorization must be enforced server-side.

| Action | Administrator | Project Manager | Team Lead | Project Lead | Technical Manager | Engineer |
|---|---:|---:|---:|---:|---:|---:|
| Add/edit company people | Yes | No | No | No | No | No |
| Create project | Yes | Yes | No | No | No | No |
| Edit project planning | Yes | Yes | Yes | Yes | Limited/read-only unless defined | No |
| Create/assign tasks | Yes | Yes | Yes | Yes | By policy | No |
| Update own task | Yes | Yes | Yes | Yes | Yes | Yes |
| Review assigned task | Yes | Yes | Yes | Yes | Yes | No unless assigned reviewer role changes |
| Finish project | Yes | Assigned PM | No | No | No | No |
| Archive / restore project | Yes | No | No | No | No | No |
| Permanently delete archive | Yes | No | No | No | No | No |

The live V22 text describes a multi-level review chain, but the discovered implementation uses one assigned reviewer per task. Sequential multi-level review should be explicitly designed before production implementation.
