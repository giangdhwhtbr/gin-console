# TC-REQUIREMENTS-060: Old gin

- **REQ:** REQ-REQUIREMENTS-019@0542c98a
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-28
- **Checked:** b8f5f45e

**Preconditions:**
- The requirements request answers 502 with the cause `outdated`

**Steps:**
1. Open `/requirements/matrix?project=a`

**Expected:**
- The page says gin is too old
- It shows the command that updates it
