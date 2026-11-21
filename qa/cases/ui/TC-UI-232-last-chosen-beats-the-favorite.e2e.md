# TC-UI-232: Last chosen beats the favorite

- **REQ:** REQ-UI-124@86ecfe10
- **Priority:** high

**Preconditions:**
- Projects `a` and `b` are configured, the favorite is `a` and session storage `gin-console-project` holds `b` (chosen earlier in this tab)

**Steps:**
1. Open `/milestones`

**Expected:**
- The Milestones page of `b` is shown
- The URL becomes `/milestones?project=b`
