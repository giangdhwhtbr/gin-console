# TC-UI-239: Beads query

- **REQ:** REQ-UI-126@554192cf
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** fdf6deb7

**Preconditions:**
- Projects `a` and `b` are configured, each with a bead

**Steps:**
1. Open `/beads?project=zzz`

**Expected:**
- The page says "No project zzz is configured"
- It links to `/beads?project=a` and `/beads?project=b`
- No bead is shown
