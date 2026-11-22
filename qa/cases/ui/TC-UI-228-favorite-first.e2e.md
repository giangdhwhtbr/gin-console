# TC-UI-228: Favorite first

- **REQ:** REQ-UI-123@96cd57cc
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 97cb9302

**Preconditions:**
- Projects `a`, `b` and `c` are configured and `c` is the favorite (local storage `gin-console-favorite-project` holds `c`)

**Steps:**
1. Open `/beads?project=a`
2. Open the project switcher

**Expected:**
- `c` is listed first with its star pressed ("Remove c as favorite")
- `a` and `b` follow, with unpressed stars ("Make a the favorite")
