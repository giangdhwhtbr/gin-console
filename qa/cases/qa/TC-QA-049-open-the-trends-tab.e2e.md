# TC-QA-049: Open the Trends tab

- **REQ:** REQ-QA-018@bdddd329
- **Priority:** medium

**Preconditions:**
- Project `alpha` with the trends of REQ-QA-015 to REQ-QA-017: a `ui` line, flaky `TC-UI-001`, a median of 6300 seconds and `TC-BEADS-001` failing with bug `gin-console-3kd`

**Steps:**
1. Open `/tests?project=alpha&tab=trends`

**Expected:**
- 30 days is selected
- The chart shows the `ui` line
- `TC-UI-001` is among the flaky cases and links to `/tests/alpha/TC-UI-001`
- The median reads "1 h 45 min"
- `TC-BEADS-001` links to `/beads/alpha/gin-console-3kd`
