# TC-MILESTONE-UI-131: Timeline on a phone

- **REQ:** REQ-MILESTONE-UI-036@08976195
- **Priority:** high

**Preconditions:**
- Project `example` with milestone `ex-m2` (active, 16 Nov to 4 Dec 2026) and epic `ex-e13` "Multi-currency pricing" planned 2026-12-11 to 2027-02-02

**Test data:**
- Today: 2026-11-26
- Window width: 390 px

**Steps:**
1. Set the window width to 390 px
2. Open `/milestones?project=example`

**Expected:**
- The title of `ex-e13` and the milestone title stay visible
- The axis scrolls sideways inside its frame (its content is wider than the frame)
- The page has no horizontal scroll
