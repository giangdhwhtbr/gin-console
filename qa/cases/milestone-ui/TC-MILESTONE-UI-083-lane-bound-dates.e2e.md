# TC-MILESTONE-UI-083: Lane-bound dates

- **REQ:** REQ-MILESTONE-UI-003@8d87bf55
- **Priority:** medium

**Preconditions:**
- Milestone `M1` of project `P` with `lanes: 1` whose `show` output places independent epics A on 2026-11-09 to 2026-11-10 and B on 2026-11-11 to 2026-11-12

**Test data:**
- None

**Steps:**
1. Open `/milestones/P/M1`

**Expected:**
- B's bar starts on 2026-11-11, after A's bar ends, and not alongside A
