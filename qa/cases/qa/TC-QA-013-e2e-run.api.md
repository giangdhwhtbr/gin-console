# TC-QA-013: E2E run

- **REQ:** REQ-QA-005@2750cd36
- **Priority:** high

**Preconditions:**
- Case `TC-UI-115` with `run` `qa/evidence/2026-11-23T10-34-33` and the file `qa/evidence/2026-11-23T10-34-33/tc-ui-115/result.json` with status `passed` and two steps whose screenshots `01.png` and `02.png` exist, `02.png` being text

**Steps:**
1. Send `GET /api/qa/cases/alpha/TC-UI-115`

**Expected:**
- `latest_run` has `folder` `qa/evidence/2026-11-23T10-34-33`, `status` `passed`, and steps 1 and 2
- Step 1 has `screenshot` true and step 2 has `screenshot` false
