# TC-BEADS-007: A failed read is not kept

- **REQ:** REQ-BEADS-004@7e67b39a
- **Priority:** medium

**Preconditions:**
- Project P whose last read of `.beads/issues.jsonl` failed (e.g. the file was missing)

**Steps:**
1. Request the list of P and see the error
2. Make the file readable without changing anything else
3. Request the list of P again

**Expected:**
- The file is read again on the second request
- The second response is 200 with the beads of the file
