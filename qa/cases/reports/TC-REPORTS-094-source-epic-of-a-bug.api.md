# TC-REPORTS-094: Source epic of a bug

- **REQ:** REQ-REPORTS-040@9bfbdab2
- **Priority:** high

**Preconditions:**
- Project `alpha` with epics `e-1`, `e-2` and `e-3`, the tracks `t-1` and `t-3` (children of `e-1`), `t-2` (child of `e-2`) and `t-9` (child of `e-3`), and the task `k-1` (child of `e-1`)
- Open bugs, each without other links unless stated:
- `b-1` discovered from `t-1`
- `b-2` discovered from epic `e-2`, itself a child of `e-1`
- `b-3`, a child of `e-1`, discovered from `t-2`
- `b-4` discovered from `t-0` (no parent), from `t-5` (not in the project) and from `t-9`
- `b-5` discovered from bug `b-6`, a child of `e-1`; `b-7` discovered from bug `b-8`, which has no parent and is discovered from `t-3`
- `b-9`, a child of `k-1`, without links
- `b-10` without links and parents; tasks `c-1` and `c-2` each the parent of the other, with `b-11` a child of `c-1`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/bugs?project=alpha&days=30`

**Expected:**
- In `open`, the `epic` of `b-1` is `e-1`, of `b-2` is `e-2`, of `b-3` is `e-2`, of `b-4` is `e-3`, of `b-5` is `e-1` and of `b-9` is `e-1`
- The `epic` of `b-7`, `b-10` and `b-11` is `null` (source unknown)
