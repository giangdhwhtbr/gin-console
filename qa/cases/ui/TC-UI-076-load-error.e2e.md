# TC-UI-076: Load error

- **REQ:** REQ-UI-075@59cf5290
- **Priority:** medium

**Preconditions:**
- The request for the beads of project `alpha` fails
- A later refresh of the beads request also fails after a first success

**Steps:**
1. Open `/beads/alpha/graph`

**Expected:**
- The error and a Retry button are shown
- After a later refresh that fails, the last graph stays
