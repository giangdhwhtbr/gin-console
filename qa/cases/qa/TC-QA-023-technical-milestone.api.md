# TC-QA-023: Technical milestone

- **REQ:** REQ-QA-008@9734b99b
- **Priority:** medium

**Preconditions:**
- Milestone `m3` whose only epic changed no requirement and is shipped; no open P0 or P1 bug

**Steps:**
1. Send `GET /api/qa/readiness/alpha/m3`

**Expected:**
- `cases` and `results` pass with the note "No requirement changed"
- The verdict is `ready`
