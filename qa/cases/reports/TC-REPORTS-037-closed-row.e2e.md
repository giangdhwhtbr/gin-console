# TC-REPORTS-037: Closed row

- **REQ:** REQ-REPORTS-016@274a4232
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-56-47
- **Checked:** 135db82d

**Preconditions:**
- A closed bead `a-3` with cycle 0.9 days, `late_days` 2 and `rework` 0

**Test data:**
- None

**Steps:**
1. Select the Closed list

**Expected:**
- Its row shows "0.9 d" under Cycle, the text "2 d late" in the warning colour under On time, and "0" under Rework
- Its title opens `/beads/alpha/a-3`
