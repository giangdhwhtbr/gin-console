# TC-UI-163: Idle lane with an expired lease

- **REQ:** REQ-UI-112@5621fb16
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 1e6cda9f

**Preconditions:**
- Lane `infra` has track 5 closed and track 6 open, assigned to `chi`
- Track 6 has a `claim` that expired yesterday

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e12`

**Expected:**
- The `infra` header shows State "Idle", Held by `chi` and Lease "expired <yesterday date and time>"
