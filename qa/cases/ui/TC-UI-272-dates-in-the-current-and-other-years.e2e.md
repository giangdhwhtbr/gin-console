# TC-UI-272: Dates in the current and other years

- **REQ:** REQ-UI-131@c08d8d6a
- **Priority:** high

**Preconditions:**
- The browser date is 21 Nov 2026
- A bead page or list shows the dates 2026-11-05 and 2025-12-01 and the time 2026-05-11T16:00 (for example as the `updated_at` of three beads of project `alpha`)

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=list`

**Expected:**
- The dates read "5 Nov", "1 Dec 2025" and "11 May, 16:00"
- No date is written in the browser's locale format
