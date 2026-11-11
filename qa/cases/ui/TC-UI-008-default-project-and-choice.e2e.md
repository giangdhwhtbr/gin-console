# TC-UI-008: Default project and choice

- **REQ:** REQ-UI-023@3b9a5087
- **Priority:** high

**Preconditions:**
- Two projects A and B in `/api/projects/beads`, both existing, each with beads

**Steps:**
1. Open /beads without `?project=`
2. Choose B in the project select

**Expected:**
- After step 1 the select shows A and the beads of A are listed
- After step 2 the URL has `?project=B` and the list shows the beads of B
