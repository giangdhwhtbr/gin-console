# TC-QA-046: Rate and gap

- **REQ:** REQ-QA-015@53515a5b
- **Priority:** medium

**Preconditions:**
- Capability `ui` has 3 passed and 1 failed runs on 2026-11-26, none on 2026-11-27 and 2 passed on 2026-11-28
- One `blocked` run on 2026-11-27

**Steps:**
1. Send `GET /api/qa/trends/alpha`

**Expected:**
- The `ui` points read 0.75 on 2026-11-26, `null` on 2026-11-27 and 1.0 on 2026-11-28
