# TC-UI-118: Unbroken title on a phone

- **REQ:** REQ-UI-107@99b7498f
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 9a58a081

**Preconditions:**
- Project `alpha` has bead `t-1` titled "Handle PaymentReconciliationServiceTimeoutExceptionHandlerFactoryProviderBean in the worker"
- The browser window is 390px wide

**Steps:**
1. Open `/beads/alpha/t-1`

**Expected:**
- The heading wraps inside the window
- The page does not scroll sideways
