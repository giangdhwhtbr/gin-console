# TC-BEADS-085: Images of a gin-qa evidence section

- **REQ:** REQ-BEADS-026@8e331dd0
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-27T00-00-02-api
- **Checked:** 5b4fc913

**Preconditions:**
- Bug `b-1` in project `p` whose description holds `## Evidence`, `- ![TC-UI-115 step 1: Open the list](attachment:A)` and `  local: qa/evidence/r1/tc-ui-115/01.png`

**Steps:**
1. Send `GET /api/beads/p/b-1`

**Expected:**
- `images` holds one image: `n` 1, `sha256` `A`, `path` `qa/evidence/r1/tc-ui-115/01.png`, caption "TC-UI-115 step 1: Open the list"
- The `attachment:` address and the `local:` line give one image, not two
