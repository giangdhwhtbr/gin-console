# TC-UI-107: Nothing matches

- **REQ:** REQ-UI-106@9683653c
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** f9830c7f

**Preconditions:**
- Project `p` with beads, none of which matches the search "zzz"

**Steps:**
1. Open `/beads?project=p&milestone=all&view=graph&q=zzz`

**Expected:**
- The view says "No beads match these filters"
