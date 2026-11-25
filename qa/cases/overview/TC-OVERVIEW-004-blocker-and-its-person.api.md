# TC-OVERVIEW-004: Blocker and its person

- **REQ:** REQ-OVERVIEW-002@1bf3dfee
- **Priority:** high

**Preconditions:**
- Bead `t-3` has waited 4 working days and depends on the open bead `t-8` assigned to `bao@example.com`

**Steps:**
1. Build the overview
2. Request `GET /api/overview`

**Expected:**
- `t-3` is in `blocked` with `days` 4
- Its `blocker` is `t-8` with `person` `bao`
