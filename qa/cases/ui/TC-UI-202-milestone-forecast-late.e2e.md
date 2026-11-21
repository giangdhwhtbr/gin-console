# TC-UI-202: Milestone forecast late

- **REQ:** REQ-UI-120@39a3c2e0
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-21T05-35-24
- **Checked:** d03f82fb

**Preconditions:**
- Milestone `ex-m2` "Checkout v2" is active from 10 Nov to 1 Dec 2026 with a forecast finish of 16 Feb 2027
- `ex-e12` belongs to `ex-m2`
- The browser date is 20 Nov 2026

**Steps:**
1. Open `/beads/example/ex-e12`

**Expected:**
- The Milestone card shows "ex-m2 Checkout v2" as a link to the milestone page
- The card shows "10 Nov – 1 Dec 2026"
- The card shows "8 working days" left
- The card shows the finish 16 Feb 2027 with a warning mark
