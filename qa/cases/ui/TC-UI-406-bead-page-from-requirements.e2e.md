# TC-UI-406: Bead page from Requirements

- **REQ:** REQ-UI-057@f37002dd
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** 1cc2bc54

**Preconditions:**
- Project `a` has the requirement `REQ-AUTH-001` with the bead `a-1`

**Steps:**
1. Open `/requirements/matrix?project=a&req=REQ-AUTH-001`
2. Choose the bead `a-1` in the panel

**Expected:**
- Only the Requirements link of the "Main" navigation has `aria-current="page"`
