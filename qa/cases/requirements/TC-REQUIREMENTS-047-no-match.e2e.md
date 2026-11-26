# TC-REQUIREMENTS-047: No match

- **REQ:** REQ-REQUIREMENTS-014@99d1fce2
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T02-30-19
- **Checked:** 3f8a427e

**Preconditions:**
- Several requirements are listed

**Steps:**
1. Open `/requirements/matrix?project=a`
2. Type `zzzz` into "Search"
3. Choose "Clear filters"

**Expected:**
- "No requirements match" is shown with the control "Clear filters"
- After the control, all requirements are listed again
