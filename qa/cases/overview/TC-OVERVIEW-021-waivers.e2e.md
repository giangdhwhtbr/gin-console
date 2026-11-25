# TC-OVERVIEW-021: Waivers

- **REQ:** REQ-OVERVIEW-008@9fc51ce2
- **Priority:** high

**Preconditions:**
- In-progress epic `e-1` has `plan_approved` `waived(hotfix)` and a review waiver of `e-1.2` with the reason "no reviewer"

**Steps:**
1. Open `/`
2. Wait until the gates are read

**Expected:**
- "Waivers (2)" lists `plan_approved` with "hotfix"
- It also lists `e-1.2` with "no reviewer"
