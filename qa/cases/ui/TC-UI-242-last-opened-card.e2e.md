# TC-UI-242: Last opened card

- **REQ:** REQ-UI-127@8e22a671
- **Priority:** high

**Preconditions:**
- Project `a` has beads `a-1` to `a-8`

**Steps:**
1. Open `/beads?project=a&view=board`
2. Open the card `a-7`
3. Use the browser Back button

**Expected:**
- The card `a-7` has the keyboard focus
- The card `a-7` is marked as last opened, and the mark is gone after 2 seconds
