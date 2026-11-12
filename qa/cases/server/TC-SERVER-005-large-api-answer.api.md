# TC-SERVER-005: Large API answer

- **REQ:** REQ-SERVER-011@1be7c6cf
- **Priority:** high

**Preconditions:**
- Project `alpha` whose bead list with closed beads is larger than 1000 bytes when serialized

**Steps:**
1. Send `GET /api/beads?project=alpha&closed=1` with `Accept-Encoding: gzip`
2. Send `GET /api/beads?project=alpha&closed=1` with `Accept-Encoding: identity`
3. Decompress the body of the first response

**Expected:**
- The first response has `Content-Encoding: gzip`
- The decompressed body is the same JSON as the body of the second response
