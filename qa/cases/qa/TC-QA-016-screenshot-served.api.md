# TC-QA-016: Screenshot served

- **REQ:** REQ-QA-006@30bc8f4c
- **Priority:** high

**Preconditions:**
- Step 1 of the latest run of `TC-UI-115`, a PNG screenshot of 150 KB

**Steps:**
1. Send `GET /api/qa/cases/alpha/TC-UI-115/run/steps/1/screenshot`

**Expected:**
- The response is 200 with `image/png` and the file's bytes
- The headers `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox; default-src 'none'`, `Content-Disposition: inline` and `Cache-Control: private, no-cache` are set
