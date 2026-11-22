# TC-MILESTONE-UI-084: Newer warnings

- **REQ:** REQ-MILESTONE-UI-003@8d87bf55
- **Priority:** medium

**Preconditions:**
- Milestone `M1` of project `P` with integration 2026-11-24 whose epics have one warning each: `spec_due`, `after_integration`, `open_bugs` with `count: 2` and `oversized` with `days: 3`

**Test data:**
- None

**Steps:**
1. Open `/milestones/P/M1`

**Expected:**
- The verdicts read "Spec due before kick-off", "Ends after integration on 24 Nov", "2 open bugs" and "3 working days longer than the milestone", each as the verdict of an epic with that one warning, or in the tooltip of the verdict of an epic with several
