# TC-UI-252: Loading

- **REQ:** REQ-UI-063@4b804324
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T02-30-19
- **Checked:** 10ba8b53

**Preconditions:**
- Project `example` has milestone `m1`, whose request has not been answered yet

**Steps:**
1. Open `/milestones/example/m1`

**Expected:**
- While the milestone loads, the document title is `gin-console`
