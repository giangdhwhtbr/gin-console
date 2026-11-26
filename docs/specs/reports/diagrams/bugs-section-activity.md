# Bugs section

Use case: see-where-bugs-come-from

How the Bugs section turns the bug beads of one project's `bd export` snapshot into figures, weeks, epic rows and open bugs for the selected scope (REQ-REPORTS-039 to REQ-REPORTS-044).

```mermaid
flowchart TD
  subgraph pm[PM]
    start((Start))
    open[Open Reports and select Bugs]
    pick[Pick another milestone or period]
    retry[Press Retry]
    row[Open an epic or an open bug]
  end
  subgraph server[Server]
    valid{Project and scope valid?}
    reject[Answer 404 or 422]
    fresh{Answered in the last 60 seconds?}
    kept[Use the kept answer]
    read{Export readable?}
    failed[Answer 502]
    linked{A discovered-from target reaches an epic?}
    byLink[Source is that epic]
    parent{An epic among the parents?}
    byParent[Source is the nearest epic]
    unknown[Source unknown]
    count[Count opened and closed by local date in the period, weeks, epic rows, open bugs]
  end
  subgraph page[Console page]
    request[Request the bugs report for the scope]
    current{Scope still selected?}
    drop[Drop the answer]
    ok{Answer ok?}
    error[Show the error with Retry]
    any{Project has bugs?}
    none[Show No bugs in project]
    inScope{Bugs opened or closed in the scope?}
    noScope[Show No bugs in this scope in place of the bars]
    show[Show figures, weeks, epics and open bugs, and the open bugs as headline]
    next{Next?}
    finish(((End)))
  end
  start --> open
  open --> request
  request --> valid
  valid -->|no| reject
  valid -->|yes| fresh
  fresh -->|yes| kept
  fresh -->|no| read
  read -->|2e no| failed
  read -->|2 yes| linked
  linked -->|yes| byLink
  linked -->|no| parent
  parent -->|yes| byParent
  parent -->|2a no| unknown
  byLink --> count
  byParent --> count
  unknown --> count
  kept --> current
  count --> current
  failed --> current
  reject --> current
  current -->|no| drop
  current -->|yes| ok
  drop --> finish
  ok -->|2e no| error
  ok -->|yes| any
  error --> retry
  retry --> request
  any -->|3a no| none
  any -->|3 yes| inScope
  inScope -->|3b no| noScope
  inScope -->|3 yes| show
  noScope --> show
  show --> next
  next -->|4 open a row| row
  next -->|1a other scope| pick
  pick --> request
  row --> finish
  none --> finish
```
