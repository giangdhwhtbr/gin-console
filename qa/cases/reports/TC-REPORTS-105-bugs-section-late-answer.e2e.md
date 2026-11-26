# TC-REPORTS-105: Bugs section late answer

- **REQ:** REQ-REPORTS-044@0fa589cf
- **Priority:** medium

**Preconditions:**
- Project `alpha`; the answer for 30 days is delayed until the answer for 7 days has arrived

**Test data:**
- None

**Steps:**
1. Open `/reports/bugs?project=alpha&days=30`
2. Pick "Last 7 days" in the scope select
3. Let the answer for 30 days arrive

**Expected:**
- After step 2, the section shows the report for 7 days
- After step 3, the section still shows the report for 7 days
