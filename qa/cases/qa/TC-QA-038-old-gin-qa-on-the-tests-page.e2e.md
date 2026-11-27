# TC-QA-038: Old gin-qa on the Tests page

- **REQ:** REQ-QA-013@019c08c4
- **Priority:** medium

**Preconditions:**
- A `gin-qa` whose export has no `effective_result`

**Steps:**
1. Open `/tests?project=alpha`

**Expected:**
- The page reads "This gin-qa is too old; run gin-workflow/install.sh --plugin gin-qa"
