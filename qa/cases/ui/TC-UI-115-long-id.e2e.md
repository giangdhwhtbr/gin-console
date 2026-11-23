# TC-UI-115: Long id

- **REQ:** REQ-UI-107@99b7498f
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Bug:** gin-console-3kd
- **Checked:** 1e92da9b

**Preconditions:**
- Project `alpha` has bead `ex-payments-provider-migration-and-reconciliation-2026.2.1`

**Steps:**
1. Open `/beads?project=alpha&milestone=all`

**Expected:**
- Its id reads `ex-payments-pr…-2026.2.1`
- The full id is the `title` of the id
