# TC-REPORTS-042: Failure

- **REQ:** REQ-REPORTS-017@94b4aefa
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** a5662572

**Preconditions:**
- `/api/reports/team` answers 502 once and then 200

**Test data:**
- None

**Steps:**
1. Open `/reports?project=alpha&tab=team`
2. Press Retry

**Expected:**
- The first answer shows an error
- The Team tab shows the report after Retry
