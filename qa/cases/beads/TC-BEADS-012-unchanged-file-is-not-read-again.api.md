# TC-BEADS-012: Unchanged file is not read again

- **REQ:** REQ-BEADS-012@fa3e7871
- **Priority:** high

**Preconditions:**
- Project P with a snapshot taken from a file of 2000 bytes modified at t1

**Steps:**
1. Request the list of P while the file still has that size and time

**Expected:**
- The response is 200
- The file was not read again
