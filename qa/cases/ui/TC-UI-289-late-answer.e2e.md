# TC-UI-289: Late answer

- **REQ:** REQ-UI-093@d350c545
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-56-47
- **Checked:** 63f12cc1

**Preconditions:**
- The report for 30 days is loading (its answer is delayed)
- The window is 900px wide, so the page shows its tab list

**Test data:**
- None

**Steps:**
1. Open `/reports?project=alpha&days=30&tab=delivery`
2. Pick 7 days
3. Let the answer for 30 days arrive

**Expected:**
- The page does not show the answer for 30 days
- The page shows the report for 7 days
