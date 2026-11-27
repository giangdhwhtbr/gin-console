# TC-CONFIG-009: Relative evidence folder

- **REQ:** REQ-CONFIG-008@d85403e6
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-27T00-00-02-api
- **Checked:** be9694d5

**Preconditions:**
- A project `q` with `evidence_roots: [shots]`

**Test data:**
- Other invalid values: `/abs/shots` (not a list), `{a: 1}`, `[/abs, shots]`

**Steps:**
1. Start the console

**Expected:**
- The console exits with a non-zero status
- The message names `projects.0.evidence_roots`
