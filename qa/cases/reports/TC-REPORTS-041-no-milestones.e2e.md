# TC-REPORTS-041: No milestones

- **REQ:** REQ-REPORTS-017@33de80f9
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** abdf0ca6

**Preconditions:**
- The team report of `beta` has no milestones

**Test data:**
- None

**Steps:**
1. Open `/reports/team?project=beta`

**Expected:**
- The URL becomes `/reports/team?project=beta&days=30`
- The Team section shows the last 30 days
