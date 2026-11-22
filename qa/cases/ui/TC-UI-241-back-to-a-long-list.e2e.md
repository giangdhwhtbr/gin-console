# TC-UI-241: Back to a long list

- **REQ:** REQ-UI-127@8e22a671
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 5672be6b

**Preconditions:**
- Project `a` has 60 beads, so the List view is longer than the window

**Steps:**
1. Open `/beads?project=a&view=list`
2. Scroll the page 1,200px down
3. Open a bead from the list
4. Use the browser Back button

**Expected:**
- The List view is shown again at 1,200px down
