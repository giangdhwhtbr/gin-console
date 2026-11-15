# TC-UI-117: Unbroken title on a card

- **REQ:** REQ-UI-107@99b7498f
- **Priority:** high

**Preconditions:**
- Project `alpha` has a bead titled "Handle PaymentReconciliationServiceTimeoutExceptionHandlerFactoryProviderBean in the worker"
- The browser window is 1440px wide

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`

**Expected:**
- The title wraps inside its Board card
- The page does not scroll sideways
