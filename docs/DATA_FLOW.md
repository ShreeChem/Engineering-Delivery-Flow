# Current V22 Prototype Architecture

```text
Browser / PWA
   |
   +-- UI and role-specific views
   +-- project/task/query workflow rules
   +-- reporting / import-export logic
   +-- service worker / installable PWA
   |
   v
Browser localStorage
```

The live V22 has no shared application database. Data entered in one browser profile is not automatically available on another user's device. The role selector is a demonstration mechanism, not secure authentication.

The live Hatchable project also contains an administrator-only `/api/qa` smoke-test function. The discovered implementation references legacy populated-demo selectors/users and should be replaced with a V22 fresh-start lifecycle test before being used as release evidence.
