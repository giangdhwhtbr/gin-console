# TC-UI-086: Place and filters

- **REQ:** REQ-UI-072@950311bf
- **Priority:** high

**Preconditions:**
- Project `a` with bead `a-1`

**Steps:**
1. Open `/beads?project=a&view=board&status=open&q=fix`
2. Open the bead page of `a-1`

**Expected:**
- The breadcrumb reads "Beads › Board · 2 filters" then `a-1`
- The first link goes to `/beads?project=a&view=board&status=open&q=fix`
