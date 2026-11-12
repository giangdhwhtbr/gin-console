# TC-SERVER-006: Small answer

- **REQ:** REQ-SERVER-011@1be7c6cf
- **Priority:** medium

**Preconditions:**
- The server is running

**Steps:**
1. Send `GET /api/health` with `Accept-Encoding: gzip`

**Expected:**
- The response has no `Content-Encoding` header
