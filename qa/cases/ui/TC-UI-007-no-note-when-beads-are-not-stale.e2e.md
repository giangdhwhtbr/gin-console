# TC-UI-007: No note when beads are not stale

- **REQ:** REQ-UI-103@e6e5851a
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-45-40
- **Checked:** 583ef2f1

**Preconditions:**
- Project A whose `beads` has no `stale` key, or `stale: false`

**Steps:**
1. Open /beads?project=A

**Expected:**
- No "may be out of date" note is shown
