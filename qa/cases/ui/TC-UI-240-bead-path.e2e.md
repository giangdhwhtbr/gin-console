# TC-UI-240: Bead path

- **REQ:** REQ-UI-126@a9ca80b7
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** d9ece0e9

**Preconditions:**
- Projects `a` and `b` are configured; the current project is `a`

**Steps:**
1. Open `/beads?project=a`
2. Open `/beads/zzz/z-1`
3. Click "Beads" in the main navigation

**Expected:**
- After step 2 the page says "No project zzz is configured"
- After step 3 the Beads page of `a` is shown, so the current project is unchanged
