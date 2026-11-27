# TC-AUTH-025: Refresh pulls own projects

- **REQ:** REQ-AUTH-008@b76725cd
- **Priority:** high

**Preconditions:**
- Projects `a` and `b`, both with `pull` on; user `an` with projects `[a]`

**Steps:**
1. Post to `/api/refresh` as `an`

**Expected:**
- `bd dolt pull` runs in `a` only
