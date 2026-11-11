# TC-BEADS-005: Every view comes from one file read

- **REQ:** REQ-BEADS-004@7e67b39a
- **Priority:** high

**Preconditions:**
- Project P whose snapshot is current; reads of `.beads/issues.jsonl` are counted

**Steps:**
1. Request the list of P
2. Request the list of P with `closed=1`
3. Request one bead of P
4. Request the comments of that bead

**Expected:**
- All four responses succeed
- The file was read once
