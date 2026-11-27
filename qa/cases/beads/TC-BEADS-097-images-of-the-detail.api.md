# TC-BEADS-097: Images of the detail

- **REQ:** REQ-BEADS-002@416355c8
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-27T00-00-02-api
- **Checked:** b09c7a7d

**Preconditions:**
- Project `p` with a file `qa/evidence/r1/01.png` and bug `b-1` whose description names `qa/evidence/r1/01.png` and `/tmp/x.png`

**Steps:**
1. Send `GET /api/beads/p/b-1`

**Expected:**
- `images` is `{n: 1, path: "qa/evidence/r1/01.png", caption: "01.png", available: true}` and `{n: 2, path: "/tmp/x.png", caption: "x.png", available: false}`
