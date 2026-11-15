# TC-UI-138: Health alert

- **REQ:** REQ-UI-003@74d726be
- **Priority:** high

**Preconditions:**
- Project `alpha` has `decision` `hold`, the warning "event log unreadable" and one review waiver for `t-1`

**Steps:**
1. Open `/`

**Expected:**
- The card of `alpha` shows an alert with "hold" and the warning
- The card shows "1 review waiver" naming `t-1`
