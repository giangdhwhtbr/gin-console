# TC-REQUIREMENTS-043: Row

- **REQ:** REQ-REQUIREMENTS-013@ae9a08c0
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** 6bf3002f

**Preconditions:**
- An untested requirement has two closed beads, one passed case and one outdated case

**Steps:**
1. Open `/requirements/matrix?project=a`

**Expected:**
- Its row reads "Untested, outdated", beads "2/2" and cases "1/2"
- The status counts and the table are grouped by capability
