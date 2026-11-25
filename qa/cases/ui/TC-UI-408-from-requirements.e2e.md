# TC-UI-408: From Requirements

- **REQ:** REQ-UI-072@bb47458a
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T23-57-16
- **Checked:** 84e0bfc5

**Preconditions:**
- The requirement `REQ-AUTH-001` is untested and has the bead `a-1`

**Steps:**
1. Open `/requirements/matrix?project=a&status=untested&req=REQ-AUTH-001`
2. Open the bead `a-1` from the panel of the requirement

**Expected:**
- The breadcrumb reads "Requirements" then the title of `a-1`
- "Requirements" goes to `/requirements/matrix?project=a&status=untested&req=REQ-AUTH-001`, the place the Matrix section was last at
