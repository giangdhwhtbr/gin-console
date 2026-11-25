# TC-UI-249: Six links

- **REQ:** REQ-UI-055@9421147f
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-28
- **Checked:** 2ed0276c

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `a`

**Steps:**
1. Open `/my-tasks?project=a`

**Expected:**
- The "Main" navigation holds the links Overview, Beads, My work, Milestones, Requirements and Reports, one each, in that order
- They go to `/`, `/beads?project=a`, `/my-tasks?project=a`, `/milestones?project=a`, `/requirements?project=a` and `/reports?project=a`
