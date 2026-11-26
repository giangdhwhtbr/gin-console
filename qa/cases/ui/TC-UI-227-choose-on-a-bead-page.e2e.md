# TC-UI-227: Choose on a bead page

- **REQ:** REQ-UI-123@1d5f1e95
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** bda852f3

**Preconditions:**
- Projects `a` and `b` are configured; project `a` has bead `a-1`

**Steps:**
1. Open `/beads/a/a-1`
2. Open the project switcher
3. Choose project `b`

**Expected:**
- The Beads page of `b` is shown, at `/beads?project=b`
