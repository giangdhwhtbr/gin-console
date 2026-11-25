# TC-UI-228: Favorite first

- **REQ:** REQ-UI-123@74fc3d51
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 6318f2ac

**Preconditions:**
- Projects `a`, `b` and `c` are configured and `c` is the favorite (local storage `gin-console-favorite-project` holds `c`)

**Steps:**
1. Open `/beads?project=a`
2. Open the project switcher

**Expected:**
- `c` is listed first with its star pressed ("Remove c as favorite")
- `a` and `b` follow, with unpressed stars ("Make a the favorite")
