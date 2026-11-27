# TC-BEADS-085: Images of a gin-qa evidence section

- **REQ:** REQ-BEADS-026@ac85fc9c
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-27T00-00-02-api
- **Checked:** 5b4fc913

**Preconditions:**
- Bug `b-1` in project `p` whose description holds `## Evidence`, `- ![TC-UI-115 step 1: Open the list](attachment:ab12)` and `  local: qa/evidence/r1/tc-ui-115/01.png`

**Steps:**
1. Send `GET /api/beads/p/b-1`

**Expected:**
- `images` holds one image: `n` 1, `path` `qa/evidence/r1/tc-ui-115/01.png`, caption "TC-UI-115 step 1: Open the list"
- Nothing is listed for the `attachment:` address
