# TC-BEADS-008: Missing export file answers 502 with the fix

- **REQ:** REQ-BEADS-005@82adf461
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 6bad4439

**Preconditions:**
- Project P whose `.beads` has no `issues.jsonl`

**Steps:**
1. Request the list of P

**Expected:**
- The response is 502
- `error` names `.beads/issues.jsonl` and `bd config set export.auto true`
- `error` also names `bd config set export.interval 1s`
