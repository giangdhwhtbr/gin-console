# TC-MILESTONE-UI-041: Two weeks starts on the Monday of today
REQ: REQ-MILESTONE-UI-011@83b54b5c
Priority: high

Preconditions:
- milestone M1 whose plan spans 2026-11-02 to 2026-11-27 and `today: 2026-11-11`

Steps:
1. Open /milestones/P/M1?tab=gantt&start=2026-11-02
2. Choose "2 weeks" in Zoom

Expected:
- The URL has `zoom=2w` and keeps `tab=gantt` and `start=2026-11-02`
- The days in view are 2026-11-09 to 2026-11-22
