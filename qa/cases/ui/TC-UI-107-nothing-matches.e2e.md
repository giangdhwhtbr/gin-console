# TC-UI-107: Nothing matches

- **REQ:** REQ-UI-106@aef48e9b
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Project `p` with beads, none of which matches the search "zzz"

**Steps:**
1. Open `/beads?project=p&milestone=all&view=graph&q=zzz`

**Expected:**
- The view says "No beads match these filters"
