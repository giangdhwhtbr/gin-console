# TC-BEADS-013: Changed file is read again

- **REQ:** REQ-BEADS-012@fa3e7871
- **Priority:** high

**Preconditions:**
- Project P with a snapshot taken from a file modified at t1

**Steps:**
1. Write the file again so it is modified at t2 and a bead differs
2. Request the list of P

**Expected:**
- The file was read again
- The list shows the change
