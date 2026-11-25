# TC-UI-252: Loading

- **REQ:** REQ-UI-063@aa232cd1
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** a9cb5097

**Preconditions:**
- Project `example` has milestone `m1`, whose request has not been answered yet

**Steps:**
1. Open `/milestones/example/m1`

**Expected:**
- While the milestone loads, the document title is `gin-console`
