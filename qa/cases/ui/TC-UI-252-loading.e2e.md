# TC-UI-252: Loading

- **REQ:** REQ-UI-063@df8c5fba
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** d5e7dfca

**Preconditions:**
- Project `example` has milestone `m1`, whose request has not been answered yet

**Steps:**
1. Open `/milestones/example/m1`

**Expected:**
- While the milestone loads, the document title is `gin-console`
