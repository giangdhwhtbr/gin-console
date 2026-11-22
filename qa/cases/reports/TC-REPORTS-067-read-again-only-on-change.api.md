# TC-REPORTS-067: Read again only on change

- **REQ:** REQ-REPORTS-019@3228f7dd
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-49-45-api
- **Checked:** a87b55d0

**Preconditions:**
- The log of `alpha` was read for a report and has not changed since

**Test data:**
- None

**Steps:**
1. Build another report of `alpha`
2. Append a reopen line to the log
3. Build a report of `alpha` again

**Expected:**
- The second build does not read the log
- The third build reads it and counts the new reopen
