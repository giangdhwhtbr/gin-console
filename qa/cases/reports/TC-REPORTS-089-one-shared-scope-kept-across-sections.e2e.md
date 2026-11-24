# TC-REPORTS-089: One shared scope kept across sections and normalized in URL

- **REQ:** REQ-REPORTS-033@43896a63
- **Priority:** high

**Preconditions:**
- Project `alpha` with milestones `m1` and default `m2`
- Project `beta` with no milestones

**Test data:**
- None

**Steps:**
1. Open `/reports/delivery?project=alpha&days=7&milestone=m1&sprint=s7`
2. Open the Team section
3. Pick "Last 7 days" in the scope select
4. Open `/reports/team?project=alpha&milestone=m2&member=ann&status=closed` and pick `m1` in the scope select
5. Open `/reports/team?project=beta`

**Expected:**
- After step 1, URL normalizes to `/reports/delivery?project=alpha&milestone=m1` (dropping `days` and `sprint`) without a history entry
- After step 2, URL is `/reports/team?project=alpha&milestone=m1`
- After step 3, URL becomes `/reports/team?project=alpha&days=7` with a history entry
- After step 4, URL becomes `/reports/team?project=alpha&milestone=m1` (`member` and `status` cleared)
- After step 5, URL becomes `/reports/team?project=beta&days=30` and the select lists only the three periods
