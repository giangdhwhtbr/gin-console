# TC-UI-243: Link starts at the top

- **REQ:** REQ-UI-127@d0db8887
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** d91e8171

**Preconditions:**
- Project `a` has 60 beads

**Steps:**
1. Open `/beads?project=a&view=list`
2. Scroll the page 1,200px down
3. Click "Beads" in the main navigation

**Expected:**
- The Beads page starts at the top
