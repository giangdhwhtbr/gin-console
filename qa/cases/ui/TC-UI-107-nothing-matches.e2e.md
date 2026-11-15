# TC-UI-107: Nothing matches

- **REQ:** REQ-UI-106@3747fc19
- **Priority:** low

**Preconditions:**
- Project `p` with beads, none of which matches the search "zzz"

**Steps:**
1. Open `/beads?project=p&milestone=all&view=graph&q=zzz`

**Expected:**
- The view says "No beads match these filters"
