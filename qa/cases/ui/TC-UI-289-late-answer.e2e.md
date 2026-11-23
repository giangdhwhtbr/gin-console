# TC-UI-289: Late answer

- **REQ:** REQ-UI-093@e7ea75ab
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 23fc8cc2

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
