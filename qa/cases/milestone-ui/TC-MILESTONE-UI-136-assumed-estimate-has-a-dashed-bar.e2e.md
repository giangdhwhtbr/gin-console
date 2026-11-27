# TC-MILESTONE-UI-136: Assumed estimate has a dashed bar

- **REQ:** REQ-MILESTONE-UI-038@ccee82bf
- **Priority:** medium

**Preconditions:**
- Project `example` whose `forecast.epics` holds `ex-e12` "Regional tax rules" with `estimate_source` `assumed`, and `ex-e14` with `estimate_source` `points`

**Test data:**
- Today: 2026-11-26

**Steps:**
1. Open `/milestones?project=example`

**Expected:**
- The bar of `ex-e12` has a dashed outline and its name contains "assumed estimate"
- The bar of `ex-e14` has no dashed outline and its name does not contain "assumed estimate"
