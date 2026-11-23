# TC-UI-232: Last chosen beats the favorite

- **REQ:** REQ-UI-124@e7f9eed5
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 2fe0e1bc

**Preconditions:**
- Projects `a` and `b` are configured, the favorite is `a` and session storage `gin-console-project` holds `b` (chosen earlier in this tab)

**Steps:**
1. Open `/milestones`

**Expected:**
- The Milestones page of `b` is shown
- The URL becomes `/milestones?project=b`
