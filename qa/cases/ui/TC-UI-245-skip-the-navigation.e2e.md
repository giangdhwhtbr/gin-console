# TC-UI-245: Skip the navigation

- **REQ:** REQ-UI-128@3721ff6b
- **Priority:** medium

**Preconditions:**
- Project `a` is configured

**Steps:**
1. Open `/beads?project=a`
2. Press Tab
3. Press Enter

**Expected:**
- After step 2 the "Skip to content" link has the keyboard focus and is visible
- After step 3 the focus is on the main content and the navigation is skipped
