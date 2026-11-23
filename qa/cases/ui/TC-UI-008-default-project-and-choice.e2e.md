# TC-UI-008: Default project and choice

- **REQ:** REQ-UI-023@3c2e03cc
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 81558b80

**Preconditions:**
- Two projects A and B in `/api/projects/beads`, both existing, each with beads
- Nothing was chosen in this browser tab and there is no favorite

**Steps:**
1. Open `/beads` without `?project=`
2. Open the project switcher
3. Choose B

**Expected:**
- After step 1 the switcher names A, the URL becomes `/beads?project=A` and the beads of A are listed
- The Beads page has no project select of its own
- After step 3 the URL has `?project=B` and the list shows the beads of B
