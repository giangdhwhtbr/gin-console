# TC-UI-289: Late answer

- **REQ:** REQ-UI-093@55fd3b8b
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 23fc8cc2

**Preconditions:**
- The report for 30 days is loading (its answer is delayed)
- The window is 900px wide, so the page shows its row of section links

**Test data:**
- None

**Steps:**
1. Open `/reports/delivery?project=alpha&days=30`
2. Pick "Last 7 days" in the scope select
3. Let the answer for 30 days arrive

**Expected:**
- The page does not show the answer for 30 days
- The page shows the report for 7 days
