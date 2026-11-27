# TC-AUTH-034: Assign and unassign

- **REQ:** REQ-AUTH-012@dde67dd8
- **Priority:** high

**Preconditions:**
- User `an` with projects `[a]`; project `b` in the config

**Steps:**
1. Run `user assign an b`
2. Run `user unassign an a`

**Expected:**
- `an`'s projects are `[b]`
