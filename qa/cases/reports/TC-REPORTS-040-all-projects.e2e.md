# TC-REPORTS-040: Retired all-projects link

- **REQ:** REQ-REPORTS-017@33de80f9
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 4df28d6f

**Preconditions:**
- The current project is `alpha`

**Test data:**
- None

**Steps:**
1. Open `/reports/team?project=all`

**Expected:**
- The URL becomes `/reports/team?project=alpha` (with scope), not `project=all`
- The Team section of `alpha` is shown
- Every request to `/api/reports/team` names `project=alpha` and none names `project=all`
