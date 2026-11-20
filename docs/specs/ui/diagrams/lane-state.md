# Lane state

The state of one lane of an epic in the Lanes view header (REQ-UI-112), worked out in the browser from the lane's tracks, their `claim` leases, their blockers and the merge gates that block them; it is not stored. The first rule that holds wins, in the order All tracks closed, Running, Waiting, Blocked, Not started, Idle.

```mermaid
stateDiagram-v2
  [*] --> NotStarted
  NotStarted --> Running: a track goes in_progress or a lease is taken
  NotStarted --> Waiting: first open track blocked by an open merge gate
  NotStarted --> Blocked: first open track blocked by another open bead
  Running --> Idle: no track in_progress and every lease expired, some track closed
  Running --> AllTracksClosed: the last track closes
  Running --> Waiting: no track in_progress or live lease, next track blocked by an open merge gate
  Waiting --> NotStarted: the merge gates close and no track is closed
  Waiting --> Idle: the merge gates close and a track is closed
  Waiting --> Running: a track goes in_progress or a lease is taken
  Blocked --> NotStarted: the blocker closes and no track is closed
  Blocked --> Idle: the blocker closes and a track is closed
  Blocked --> Running: a track goes in_progress or a lease is taken
  Idle --> Running: a track goes in_progress or a lease is taken
  Idle --> Waiting: next open track blocked by an open merge gate
  Idle --> AllTracksClosed: the last track closes
  AllTracksClosed --> Running: a track is reopened and taken
  AllTracksClosed --> Idle: a track is reopened
  AllTracksClosed --> [*]
```
