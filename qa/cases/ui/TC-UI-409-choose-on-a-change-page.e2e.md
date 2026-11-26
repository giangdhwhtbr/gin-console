# TC-UI-409: Choose on a change page

- **REQ:** REQ-UI-123@1d5f1e95
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T02-30-19
- **Checked:** cbf0a976

**Preconditions:**
- Projects `a` and `b` are configured and the change page `/requirements/changes/e1-login?project=a` is shown

**Steps:**
1. Choose project `b` in the switcher

**Expected:**
- The URL becomes `/requirements/changes?project=b`
