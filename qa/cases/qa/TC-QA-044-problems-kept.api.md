# TC-QA-044: Problems kept

- **REQ:** REQ-QA-014@d76a7cda
- **Priority:** medium

**Preconditions:**
- An export with two runs and the problem `qa/runs/2026-11/bao.jsonl:4: not JSON`

**Steps:**
1. Send `GET /api/qa/trends/alpha`

**Expected:**
- The response is 200
- It counts the two runs
- `problems` lists `qa/runs/2026-11/bao.jsonl:4: not JSON`
