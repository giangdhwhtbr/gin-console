# TC-REPORTS-043: Late answer

- **REQ:** REQ-REPORTS-017@7e156804
- **Priority:** high

**Preconditions:**
- The team report for `m1` and `m2` of project `alpha` exists
- The e2e harness delays the answer for `m2` with a route stub

**Test data:**
- None

**Steps:**
1. Open `/reports?project=alpha&tab=team&milestone=m2`
2. Pick `m1` in the Milestone select
3. Release the delayed answer for `m2`

**Expected:**
- The page does not show the answer for `m2`
- The `m1` milestone line stays
