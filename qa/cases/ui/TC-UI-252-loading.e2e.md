# TC-UI-252: Loading

- **REQ:** REQ-UI-063@0282add4
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 969ea8f5

**Preconditions:**
- Project `example` has milestone `m1`, whose request has not been answered yet

**Steps:**
1. Open `/milestones/example/m1`

**Expected:**
- While the milestone loads, the document title is `gin-console`
