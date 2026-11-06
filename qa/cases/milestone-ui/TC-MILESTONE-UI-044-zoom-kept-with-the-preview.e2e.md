# TC-MILESTONE-UI-044: Zoom kept with the preview
REQ: REQ-MILESTONE-UI-011@83b54b5c
Priority: medium
Result: passed
Run: qa/evidence/2026-11-06T04-18-00

Preconditions:
- planned milestone M1

Steps:
1. Open /milestones/P/M1?zoom=1w
2. Set "Kick-start date" to 2026-11-16

Expected:
- The URL keeps `zoom=1w` and has `start=2026-11-16`
- The preview is drawn at one week
