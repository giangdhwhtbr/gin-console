# TC-UI-121: Long id keeps the title

- **REQ:** REQ-UI-044@fa72c885
- **Priority:** high

**Preconditions:**
- Project `alpha` has epic `ex-payments-provider-migration-and-reconciliation-2026` with an open task and the title "Migrate every checkout payment to the new provider"

**Steps:**
1. Open `/beads?project=alpha&milestone=all` at 1440px and open the epic
2. Open `/beads?project=alpha&milestone=all` at 390px and open the epic

**Expected:**
- At each width, each of the two rows shows its open/close control when it has children, its shortened id and at least the start of its title
