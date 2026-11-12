# TC-BEADS-022: Changed list

- **REQ:** REQ-BEADS-014@29794851
- **Priority:** medium

**Preconditions:**
- Project `alpha` with a bead `alpha-1` titled `Old title`, and `bd` auto-export on

**Steps:**
1. Send `GET /api/beads?project=alpha` and note the `ETag` header
2. Run `bd update alpha-1 --title "New title"` in project `alpha` and wait until `.beads/issues.jsonl` holds the new title
3. Send `GET /api/beads?project=alpha` with `If-None-Match` set to the `ETag` from step 1

**Expected:**
- The response to step 3 is 200
- The body of the response to step 3 lists the bead as `New title`
- The `ETag` of the response to step 3 differs from the one in step 1
