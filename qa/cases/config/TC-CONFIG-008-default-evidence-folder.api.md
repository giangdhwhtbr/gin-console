# TC-CONFIG-008: Default evidence folder

- **REQ:** REQ-CONFIG-008@d85403e6
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-27T00-00-02-api
- **Checked:** cdf2307c

**Preconditions:**
- A project without `evidence_roots`

**Steps:**
1. Start the console

**Expected:**
- The only evidence folder of the project is its `path`
