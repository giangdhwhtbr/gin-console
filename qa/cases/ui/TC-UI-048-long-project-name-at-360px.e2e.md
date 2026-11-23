# TC-UI-048: Long project name at 360px

- **REQ:** REQ-UI-061@2f7d7394
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** eba8f718

**Preconditions:**
- A project with a name of 60 characters is configured
- The window is 360px wide

**Steps:**
1. Open `/beads?project=<name>`
2. Open `/my-tasks?project=<name>`

**Expected:**
- The project switcher cuts the name short
- The page does not scroll sideways
