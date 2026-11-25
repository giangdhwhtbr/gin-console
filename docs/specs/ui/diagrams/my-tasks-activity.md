# My work

How the My work page (at `/my-tasks`) groups the beads of the current project for the signed-in email, and what the developer does with a bead (REQ-UI-100, REQ-UI-101, REQ-UI-102, REQ-UI-150, REQ-UI-151, REQ-UI-152, REQ-UI-153, REQ-BEADS-025).

Use case: pick-next-work

```mermaid
flowchart TD
  subgraph dev[Developer]
    start((Start))
    open[Open My work or press Refresh]
    choose[Open a bead from a group]
    copy[Copy the command and run it outside the console]
  end
  subgraph console[Console]
    load[Load the current project's beads, with closed=1 when the URL has it]
    failed{Request failed?}
    alert[Show an error: the project, or the project list, could not be loaded]
    group[Put beads in groups: Next up, In progress, Blocked, Waiting on me, and Closed when asked]
    any{Any bead in a group?}
    empty[Say No work for the email, with a link to the Beads page]
    show[Show the groups with their counts: cards under 768px, tables from 768px]
    blocked{Is the bead blocked?}
    names[Header shows Blocked by with each open blocker as a link]
    cmd{Has a next command?}
    next[Header shows the next command with Copy]
    none[Header shows nothing in its place]
    done(((End)))
  end
  start --> open
  open --> load
  load --> failed
  failed -->|2e failed| alert
  alert --> done
  failed -->|2 loaded| group
  group --> any
  any -->|2b nothing| empty
  empty --> done
  any -->|2 some| show
  show --> choose
  choose --> blocked
  blocked -->|3a blocked| names
  names --> done
  blocked -->|3 not blocked| cmd
  cmd -->|4 command| next
  next --> copy
  copy --> done
  cmd -->|4e none or the workflow has not loaded| none
  none --> done
```
