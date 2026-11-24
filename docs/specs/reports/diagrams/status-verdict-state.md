# Status verdict

The verdict the Status section gives a milestone (REQ-REPORTS-027). It is not stored: the frontend works it out from the status report, the Milestones list and today, so a milestone moves between these states as days pass and beads change.

```mermaid
stateDiagram-v2
  [*] --> NotStarted: today before start
  NotStarted --> OnTrack: start reached, not late, nothing at risk
  NotStarted --> AtRisk: start reached, not late, behind pace or blocked or unestimated epic
  NotStarted --> Late: start reached and late by REQ-MILESTONE-UI-023
  OnTrack --> AtRisk: pace finish after end, pace 0 with open beads, a blocked bead or an unestimated epic
  AtRisk --> OnTrack: none of those any more
  OnTrack --> Late: today or the forecast finish after end
  AtRisk --> Late: today or the forecast finish after end
  Late --> AtRisk: forecast finish back on or before end while today is not after end
  Late --> OnTrack: forecast finish back on or before end, nothing at risk
  OnTrack --> FinishedOnTime: closed on or before end
  AtRisk --> FinishedOnTime: closed on or before end
  OnTrack --> FinishedLate: closed after end
  AtRisk --> FinishedLate: closed after end
  Late --> FinishedLate: closed after end
  FinishedOnTime --> [*]
  FinishedLate --> [*]
```
