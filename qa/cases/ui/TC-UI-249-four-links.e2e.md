# TC-UI-249: Five links

- **REQ:** REQ-UI-055@01d60eec
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 67a8f6be

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `a`

**Steps:**
1. Open `/my-tasks?project=a`

**Expected:**
- The "Main" navigation holds the links Overview, Beads, My work, Milestones and Reports, one each, in that order
- They go to `/`, `/beads?project=a`, `/my-tasks?project=a`, `/milestones?project=a` and `/reports?project=a`
