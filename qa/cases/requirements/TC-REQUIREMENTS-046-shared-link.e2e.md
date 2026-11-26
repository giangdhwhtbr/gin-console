# TC-REQUIREMENTS-046: Shared link

- **REQ:** REQ-REQUIREMENTS-014@99d1fce2
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T02-30-19
- **Checked:** 1135d13d

**Preconditions:**
- Untested and covered requirements of capabilities `ui` and `server`

**Steps:**
1. Open `/requirements/matrix?project=a&status=untested&capability=ui`

**Expected:**
- Only untested requirements of `ui` are listed
- The filters show Untested and `ui`
