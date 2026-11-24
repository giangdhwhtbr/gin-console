# TC-REPORTS-028: No period choice

- **REQ:** REQ-REPORTS-012@79484a74
- **Priority:** medium

**Preconditions:**
- `/reports/team?project=alpha&days=30` on 23 Nov

**Test data:**
- None

**Steps:**
1. Open `/reports/team?project=alpha&days=30`

**Expected:**
- The scope line reads "Last 30 days, 24 Oct – 23 Nov"
- No "Open Gantt" link and no sprint field are shown
