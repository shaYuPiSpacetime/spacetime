---
name: diagnosing-bugs
description: Diagnosis loop for hard Spacetime bugs, UI mismatches, and performance regressions.
---

Start by reading the target module's existing implementation, tests, and applicable workflow skill. Redact credentials, cookies, tokens, production data, and signed URLs. Build a tight red-capable loop: backend test or HTTP script, frontend/miniapp Playwright or documented runtime check, or a reproducible fixture. Reproduce and minimise, rank falsifiable hypotheses, instrument one variable at a time, add a regression test at the correct seam, fix, and re-run the original loop. For Lanhu/UI issues, follow the repository's screenshot-difference and acceptance-report process instead of guessing from memory.
