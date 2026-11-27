# TC-AUTH-053: Grant of another folder

- **REQ:** REQ-AUTH-016@9b0a0c99
- **Priority:** medium

**Preconditions:**
- User `an` is signed in and allowed project `a`; `a` has two confirmed folders, `ui/2026-11-22` and `reports/2026-11-12`
- `an` holds the grant of `ui/2026-11-22` from the mockup list

**Steps:**
1. Request `/api/requirements/mockups/a/g/<that grant>/files/reports/2026-11-12/index.html` without a cookie

**Expected:**
- The response is 404
