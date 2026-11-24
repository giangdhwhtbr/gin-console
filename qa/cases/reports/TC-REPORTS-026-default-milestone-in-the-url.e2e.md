# TC-REPORTS-026: Default milestone in the URL

- **REQ:** REQ-REPORTS-012@79484a74
- **Priority:** high

**Preconditions:**
- The team report for `alpha` answers `milestone` `m2`
- The URL has no `milestone`

**Test data:**
- None

**Steps:**
1. Open `/reports/team?project=alpha`

**Expected:**
- The URL becomes `/reports/team?project=alpha&milestone=m2` without adding a history entry
