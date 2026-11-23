# TC-BEADS-013: Changed file is read again

- **REQ:** REQ-BEADS-012@49e4c74a
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** b6f78f3b

**Preconditions:**
- Project P with a snapshot taken from a file modified at t1

**Steps:**
1. Write the file again so it is modified at t2 and a bead differs
2. Request the list of P

**Expected:**
- The file was read again
- The list shows the change
