# TC-REPORTS-026: Default milestone in the URL

- **REQ:** REQ-REPORTS-012@a1aed608
- **Priority:** high

**Preconditions:**
- The team report for `alpha` answers `milestone` `m2`
- The URL has no `milestone`

**Test data:**
- None

**Steps:**
1. Open `/reports?project=alpha&tab=team`

**Expected:**
- The URL becomes `/reports?project=alpha&days=30&tab=team&milestone=m2` without a reload
