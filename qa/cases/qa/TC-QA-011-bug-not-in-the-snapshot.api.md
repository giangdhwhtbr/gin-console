# TC-QA-011: Bug not in the snapshot

- **REQ:** REQ-QA-004@e383217d
- **Priority:** medium

**Preconditions:**
- Case `TC-UI-116` whose `bug` names a bead the project does not have

**Steps:**
1. Send `GET /api/qa/cases/alpha/TC-UI-116`

**Expected:**
- `bug` has only its `id`; `title`, `status` and `priority` are `null`
