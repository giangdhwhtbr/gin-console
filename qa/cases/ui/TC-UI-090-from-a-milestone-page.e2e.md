# TC-UI-090: From a milestone page

- **REQ:** REQ-UI-072@950311bf
- **Priority:** high

**Preconditions:**
- Project `a` with milestone `m2` and bead `a-1` under it

**Steps:**
1. Open `/milestones/a/m2?tab=beads&view=board&status=open`
2. Open the bead page of `a-1`

**Expected:**
- The breadcrumb reads "m2 › Board · 1 filter" then `a-1`
- The first link goes to `/milestones/a/m2?tab=beads&view=board&status=open`
