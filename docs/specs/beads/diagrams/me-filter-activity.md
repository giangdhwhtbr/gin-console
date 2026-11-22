# Me filter

How the Assignee filter of the Beads page and of a milestone's Beads tab matches beads, with Me and one entry per person (REQ-BEADS-023, REQ-BEADS-024, REQ-UI-082).

Use case: filter-my-beads

```mermaid
flowchart TD
  subgraph member[Team member]
    start((Start))
    open[Open the Assignee filter]
    choose[Select an option]
  end
  subgraph browser[Browser]
    list[List Me, Unassigned when needed, then each person once]
    which{Which option?}
    me[Take the person of the stored login email]
    person[Take the chosen person]
    none[Match beads without an assignee, whatever their owner]
    match[Match beads whose assignee is that person, by handle or by email]
    any{Any bead matches?}
    show[Show the matching beads and keep the option in the URL]
    empty[Show the empty state with the filter kept]
    finish(((End)))
  end
  start --> open
  open --> list
  list --> choose
  choose --> which
  which -->|3 Me| me
  which -->|3a a person| person
  which -->|3a Unassigned| none
  me --> match
  person --> match
  match --> any
  none --> any
  any -->|4 yes| show
  any -->|4a no| empty
  show --> finish
  empty --> finish
```
