# TC-QA-040: No cases

- **REQ:** REQ-QA-013@019c08c4
- **Priority:** medium

**Preconditions:**
- Project `beta` whose export holds an empty `cases` list

**Steps:**
1. Open `/tests?project=beta`

**Expected:**
- The page reads "No test cases yet. Write them with /gin-qa:cases."
