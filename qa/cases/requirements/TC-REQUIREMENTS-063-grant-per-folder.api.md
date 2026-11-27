# TC-REQUIREMENTS-063: Grant per folder

- **REQ:** REQ-REQUIREMENTS-009@c0995b92
- **Priority:** medium

**Preconditions:**
- Auth is on; user `an` is signed in and allowed project `proj`; `proj` has two confirmed folders, `ui/2026-11-22` and `reports/2026-11-12`

**Steps:**
1. Request `GET /api/requirements/mockups?project=proj`

**Expected:**
- Each folder has a `grant` text
- The two grants differ
