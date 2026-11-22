# Milestone status and late mark

How a page shows a milestone's status and whether it is late: the Milestones list, the milestone card of a bead page or epic Overview, the header of a milestone bead's page, and the Team tab (REQ-MILESTONE-UI-022, REQ-MILESTONE-UI-023, REQ-UI-095, REQ-REPORTS-012).

```mermaid
flowchart TD
  subgraph browser[Browser]
    start((Start))
    status[Take the status from the milestones answer]
    ok{Milestones answer available?}
    fallback[Bead page shows the bead status]
    mark[Draw the status with the one milestone status mark]
    closed{Closed?}
    closedlate{Closed after end?}
    late[Add the late mark with the working days late]
    ontime[Show Closed, on time]
    past{Today after end?}
    fc{Forecast finish known and after end?}
    openlate[Add the late mark]
    pace[No late mark; the Team tab may still say behind pace]
    finish(((End)))
  end
  start --> ok
  ok -->|no| fallback
  ok -->|yes| status
  status --> mark
  mark --> closed
  closed -->|yes| closedlate
  closedlate -->|yes| late
  closedlate -->|no| ontime
  closed -->|no| past
  past -->|yes| openlate
  past -->|no| fc
  fc -->|yes| openlate
  fc -->|no| pace
  fallback --> finish
  late --> finish
  ontime --> finish
  openlate --> finish
  pace --> finish
```
