# TC-REPORTS-040: Retired all-projects link

- **REQ:** REQ-REPORTS-017@94b4aefa
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 4df28d6f

**Preconditions:**
- The current project is `alpha`

**Test data:**
- None

**Steps:**
1. Open `/reports?project=all&tab=team`

**Expected:**
- The URL names `project=alpha` and `tab=team`, not `project=all`
- The Team tab of `alpha` is shown
- Every request to `/api/reports/team` names `project=alpha` and none names `project=all`
