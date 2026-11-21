# TC-UI-244: Storage refused

- **REQ:** REQ-UI-127@8e22a671
- **Priority:** low

**Preconditions:**
- Project `a` has 60 beads; the browser throws when the position is stored

**Steps:**
1. Open `/beads?project=a&view=list`
2. Scroll the page 1,200px down
3. Open a bead from the list
4. Use the browser Back button

**Expected:**
- The page starts at the top
- No error is shown
