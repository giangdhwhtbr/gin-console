# TC-UI-334: Milestone counted only when changed

- **REQ:** REQ-UI-084@f877255d
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 26bbc7b2

**Preconditions:**
- The Beads page of project `example` at 390px wide, which has a current milestone
- URL `?project=example&milestone=all&priority=1`

**Steps:**
1. Open the page

**Expected:**
- `button "Filters"` shows the count 2
