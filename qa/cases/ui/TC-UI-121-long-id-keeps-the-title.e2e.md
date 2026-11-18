# TC-UI-121: Long id keeps the title

- **REQ:** REQ-UI-044@fa72c885
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Project `alpha` has epic `ex-payments-provider-migration-and-reconciliation-2026` with an open task and the title "Migrate every checkout payment to the new provider"

**Steps:**
1. Set the browser window to 1440px wide
2. Open `/beads?project=alpha&milestone=all`
3. Click the open control of the epic `ex-payments-provider-migration-and-reconciliation-2026`
4. Set the browser window to 390px wide
5. Open `/beads?project=alpha&milestone=all`
6. Click the open control of the epic `ex-payments-provider-migration-and-reconciliation-2026`

**Expected:**
- After step 3 each of the two rows shows its open/close control when it has children, its shortened id and at least the start of its title
- After step 6 each of the two rows shows its open/close control when it has children, its shortened id and at least the start of its title
