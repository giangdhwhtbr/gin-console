# TC-UI-267: Filter by multiple assignees

- **REQ:** REQ-UI-082@5a1bd944
- **Priority:** high

**Preconditions:**
- Project `alpha` has beads assigned to `alice@example.com`, `bob@example.com` and `carol@example.com`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=list`
2. Open the "Assignee" filter
3. Select `alice`
4. Select `bob`

**Expected:**
- Only the beads assigned to alice or bob are shown
- The URL query contains `assignee=alice,bob`
