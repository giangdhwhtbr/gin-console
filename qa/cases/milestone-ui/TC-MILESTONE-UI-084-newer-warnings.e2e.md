# TC-MILESTONE-UI-084: Newer warnings

- **REQ:** REQ-MILESTONE-UI-003@eea05295
- **Priority:** medium

**Preconditions:**
- Milestone `M1` of project `P` with integration 2026-11-24 whose epics have warnings `spec_due`, `after_integration`, `open_bugs` with `count: 2` and `oversized` with `days: 3`

**Test data:**
- None

**Steps:**
1. Open `/milestones/P/M1`

**Expected:**
- The warnings read "Spec due before kick-off"
- The warnings read "Ends after integration on 24 Nov"
- The warnings read "2 open bugs"
- The warnings read "3 working days longer than the milestone"
