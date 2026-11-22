# TC-UI-232: Last chosen beats the favorite

- **REQ:** REQ-UI-124@86ecfe10
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** c1082faf

**Preconditions:**
- Projects `a` and `b` are configured, the favorite is `a` and session storage `gin-console-project` holds `b` (chosen earlier in this tab)

**Steps:**
1. Open `/milestones`

**Expected:**
- The Milestones page of `b` is shown
- The URL becomes `/milestones?project=b`
