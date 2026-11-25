# TC-REQUIREMENTS-048: Shared link

- **REQ:** REQ-REQUIREMENTS-015@6c158555
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** dbe7f08a

**Preconditions:**
- `REQ-AUTH-001` has two scenarios, a change, a bead, a case and a test file, and a sign-off by `ba`

**Steps:**
1. Open `/requirements/matrix?project=a&req=REQ-AUTH-001`

**Expected:**
- The panel of `REQ-AUTH-001` shows the scenarios, the sign-off, the change and the bead as links, the case with its result and the test file
