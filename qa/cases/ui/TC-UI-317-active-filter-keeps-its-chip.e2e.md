# TC-UI-317: Active filter keeps its chip

- **REQ:** REQ-UI-140@f52fcd4d
- **Priority:** medium

**Preconditions:**
- Project `P` reports open and closed beads

**Steps:**
1. Open `/beads?project=P&view=list&status=open`
2. Find the active filter "Open"

**Expected:**
- The active filter is shown as a removable chip with a border and a tint
- The chip has a control that removes the filter
