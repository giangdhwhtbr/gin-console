# TC-REPORTS-026: Default milestone in the URL

- **REQ:** REQ-REPORTS-012@a1aed608
- **Priority:** high

**Preconditions:**
- The URL `/reports?project=alpha&tab=team`

**Test data:**
- None

**Steps:**
1. The answer's `milestone` is `m2`

**Expected:**
- The URL becomes `/reports?project=alpha&days=30&tab=team&milestone=m2` without a reload
