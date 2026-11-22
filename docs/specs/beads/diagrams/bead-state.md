# Bead state as shown

The state the console shows for a bead that is not a milestone (state mark, Board and Focus column, Graph node), worked out from its `status` and its `blocked` flag (REQ-BEADS-007); it is not stored. The first rule that holds wins, in the order Done, Blocked, Deferred, Ready, In progress (REQ-BEADS-021, REQ-UI-031, REQ-UI-033). A milestone bead shows its milestone status instead (REQ-MILESTONE-UI-022).

```mermaid
stateDiagram-v2
  [*] --> Ready: created open without an open blocker
  [*] --> Blocked: created with an open blocker or status blocked
  Ready --> InProgress: status in_progress or hooked
  Ready --> Blocked: an open blocker is added to it or to an ancestor
  Ready --> Deferred: status deferred
  InProgress --> Blocked: an open blocker is added, or status blocked
  Blocked --> Ready: every blocker closes and status is open
  Blocked --> InProgress: every blocker closes and status is in_progress
  Blocked --> Deferred: every blocker closes and status is deferred
  Deferred --> Ready: status open without an open blocker
  Deferred --> Blocked: an open blocker is added
  Ready --> Done: status closed
  InProgress --> Done: status closed
  Blocked --> Done: status closed
  Deferred --> Done: status closed
  Done --> Ready: reopened without an open blocker
  Done --> [*]
```
