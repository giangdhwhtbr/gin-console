# TC-BEADS-061: Labels only

- **REQ:** REQ-BEADS-019@afe14198
- **Priority:** medium

**Preconditions:**
- Project `alpha` has a bead without `Plan:` or `Lane:` lines, labelled `lane:fe` and `track:3`

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads?project=alpha`

**Expected:**
- The bead has `lane` `fe`
- The bead has `track` `{"plan": null, "number": 3}`
