# TC-UI-236: Storage refused

- **REQ:** REQ-UI-124@86ecfe10
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 57135a6f

**Preconditions:**
- Projects `a` and `b` are configured; the browser throws when a choice is stored

**Steps:**
1. Open `/beads?project=a`
2. Open the project switcher
3. Choose project `b`
4. Click "Milestones" in the main navigation

**Expected:**
- The Milestones page of `b` is shown, at `/milestones?project=b`
- No error is shown
