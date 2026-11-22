# TC-UI-272: Dates in the current and other years

- **REQ:** REQ-UI-131@c08d8d6a
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** dc4d6b38

**Preconditions:**
- The browser date is 21 Nov 2026
- The browser time zone is UTC
- Project `alpha` has three beads updated at 2026-11-05T09:00:00Z, 2025-12-01T09:00:00Z and 2026-05-11T16:00:00Z; the last one is `d-3`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=list`
2. Open `/beads/alpha/d-3`

**Expected:**
- After step 1 the List rows show the last update dates "5 Nov", "1 Dec 2025" and "11 May"
- After step 2 the bead page fact Updated reads "11 May, 16:00"
- No date is written in the browser's locale format
