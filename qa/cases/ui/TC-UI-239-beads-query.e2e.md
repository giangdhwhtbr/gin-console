# TC-UI-239: Beads query

- **REQ:** REQ-UI-126@3abbb248
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** 67fbae25

**Preconditions:**
- Projects `a` and `b` are configured, each with a bead

**Steps:**
1. Open `/beads?project=zzz`

**Expected:**
- The page says "No project zzz is configured"
- It links to `/beads?project=a` and `/beads?project=b`
- No bead is shown
