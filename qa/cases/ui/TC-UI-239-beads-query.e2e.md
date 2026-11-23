# TC-UI-239: Beads query

- **REQ:** REQ-UI-126@a9ca80b7
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** e690f239

**Preconditions:**
- Projects `a` and `b` are configured, each with a bead

**Steps:**
1. Open `/beads?project=zzz`

**Expected:**
- The page says "No project zzz is configured"
- It links to `/beads?project=a` and `/beads?project=b`
- No bead is shown
