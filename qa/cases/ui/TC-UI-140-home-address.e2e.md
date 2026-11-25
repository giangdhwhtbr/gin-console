# TC-UI-140: Home address

- **REQ:** REQ-UI-099@d20e7c33
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** ebdcd975

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `a`

**Steps:**
1. Open `/`
2. Press the browser Back button

**Expected:**
- The URL becomes `/my-tasks?project=a` and the My work page of `a` is shown
- Back does not return to `/`
