# TC-QA-037: Project without gin-qa

- **REQ:** REQ-QA-013@019c08c4
- **Priority:** high

**Preconditions:**
- Project `qwikfone` on a console host without `gin-qa`

**Steps:**
1. Open `/tests?project=qwikfone`

**Expected:**
- The page reads "gin-qa is not installed on the console host" and shows no table
