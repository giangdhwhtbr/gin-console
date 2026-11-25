# TC-OVERVIEW-001: No process

- **REQ:** REQ-OVERVIEW-001@ff4db4a2
- **Priority:** high

**Preconditions:**
- Projects `a` and `b` exist, each with a `.beads/issues.jsonl`, and are configured in this order

**Steps:**
1. Request `GET /api/overview`

**Expected:**
- The response is 200 and `projects` holds `a` then `b`, in config order
- No `gin` or `bd` process was started
