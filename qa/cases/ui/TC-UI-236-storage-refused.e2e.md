# TC-UI-236: Storage refused

- **REQ:** REQ-UI-124@86ecfe10
- **Priority:** low

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
