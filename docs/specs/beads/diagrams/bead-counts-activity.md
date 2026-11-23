# Bead counts

How one bead is classed and counted for the blocked, in-progress and done numbers of the Board and Focus columns, the Team figures and the Gantt rows, and how a bead's child counts are built (REQ-BEADS-007, REQ-BEADS-021, REQ-BEADS-022, REQ-SERVER-006, REQ-REPORTS-010, REQ-UI-031, REQ-UI-033, REQ-UI-130). The rules live in one backend module; the pages only render the result.

```mermaid
flowchart TD
  subgraph system[Server]
    start((Start))
    read[Read the project's issues.jsonl snapshot]
    kind{Merge gate or milestone?}
    skip[Leave out of every count]
    closed{Status closed?}
    done[Count as done]
    blocked{Status blocked, or an open blocker of its own or of an ancestor?}
    countb[Count as blocked]
    prog{Status in_progress or hooked?}
    counti[Count as in progress]
    other[Count by its status: deferred, ready or open]
    prep{Prep task?}
    apart[Add to the prep count of its column or page]
    main[Add to the main count]
    kids[For each bead, count its direct tracks and prep tasks, and the closed ones, over the whole export]
    api[Answer with blocked, in_progress, children and the counts]
  end
  subgraph browser[Browser]
    render[Show the numbers with the tooltip naming the rule and scope]
    finish(((End)))
  end
  start --> read
  read --> kind
  kind -->|yes| skip
  kind -->|no| closed
  closed -->|yes| done
  closed -->|no| blocked
  blocked -->|yes| countb
  blocked -->|no| prog
  prog -->|yes| counti
  prog -->|no| other
  done --> prep
  countb --> prep
  counti --> prep
  other --> prep
  prep -->|yes| apart
  prep -->|no| main
  apart --> kids
  main --> kids
  skip --> kids
  kids --> api
  api --> render
  render --> finish
```
