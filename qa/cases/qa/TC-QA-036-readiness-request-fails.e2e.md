# TC-QA-036: Readiness request fails

- **REQ:** REQ-QA-012@8e8bab41
- **Priority:** medium

**Preconditions:**
- `gin milestone show` fails for `m2`, so the readiness request answers 502 with an error

**Steps:**
1. Open `/milestones/alpha/m2?tab=readiness`

**Expected:**
- The tab shows the error and "Try again"
