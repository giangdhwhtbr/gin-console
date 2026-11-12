# TC-UI-035: Match with ancestors

- **REQ:** REQ-UI-043@fcf777e0
- **Priority:** medium

**Preconditions:**
- Project `alpha` with an open epic that has two open children titled `Fix login` and `Add search`

**Steps:**
1. Open `/beads?project=alpha&milestone=all`
2. Type `login` in the search box

**Expected:**
- The epic and the `Fix login` child are shown, with the epic open
- `Add search` is not shown
