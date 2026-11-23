# TC-UI-140: Home address

- **REQ:** REQ-UI-099@00ea3e46
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
- The URL becomes `/my-tasks?project=a` and the My Tasks page of `a` is shown
- Back does not return to `/`
