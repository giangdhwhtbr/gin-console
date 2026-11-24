# TC-REPORTS-043: Late answer

- **REQ:** REQ-REPORTS-017@33de80f9
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 75ce7839

**Preconditions:**
- The team report for `m1` and `m2` of project `alpha` exists
- The e2e harness delays the answer for `m2` with a route stub

**Test data:**
- None

**Steps:**
1. Open `/reports/team?project=alpha&milestone=m1`
2. Pick `m2` in the scope select
3. Pick `m1` in the scope select
4. Release the delayed answer for `m2`

**Expected:**
- The page does not show the answer for `m2`
- The Team section shows `m1`, and its scope line stays
