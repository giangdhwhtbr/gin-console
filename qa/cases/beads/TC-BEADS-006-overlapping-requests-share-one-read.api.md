# TC-BEADS-006: Overlapping requests share one read

- **REQ:** REQ-BEADS-004@7e67b39a
- **Priority:** medium

**Preconditions:**
- Project P with `.beads/issues.jsonl`; the read is held open so two requests overlap; reads are counted

**Steps:**
1. Send two requests for P at the same time
2. Let the read finish

**Expected:**
- Both requests complete with the same data
- The file was read once
