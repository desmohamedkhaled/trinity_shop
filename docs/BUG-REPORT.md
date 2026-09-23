# Trinity QA Bug Tracker

| Bug ID | Severity | Priority | Module | Title | Environment | Steps to reproduce | Expected | Actual | Evidence | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| BUG-001 | Low | P3 | Test automation/Admin route | Legacy smoke test expected client-rendered `Admin` and `Dashboard` markers from unauthenticated `/admin` HTML | Windows PowerShell, local Next server, `http://localhost:3000` | 1. Start local server. 2. Run the pre-fix `npm test`. 3. Observe the marker failure. | Smoke test should validate the unauthenticated route contract or use an authenticated browser test for dashboard content. | Pre-fix run failed on missing markers; corrected run passes 10/10 checks. | Terminal output from `npm test` before and after test-only correction | Resolved, test defect; application behavior unchanged |

## Triage note

The defect was in the existing smoke-test expectation. The route allows unauthenticated status codes and the admin shell is access-gated. The smoke test now checks status only for `/admin`; authenticated dashboard behavior still requires a browser test account.

No application Critical or High bugs were observed during executed unauthenticated HTTP checks.
