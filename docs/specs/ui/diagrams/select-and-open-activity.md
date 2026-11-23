# Select and open a bead

Use case: select-and-open-a-bead

How a click, a double click, `Enter` and Escape act on a row, card or node in the List, Board, Focus, Graph and Lanes views (REQ-UI-147, REQ-UI-148, REQ-UI-149).

```mermaid
flowchart TD
  subgraph dev[Developer]
    start((Start))
    act[Click, double-click or press Enter on a row, card or node]
    read[Read the bead in the panel]
    next[Click it again, open it, close the panel, change view or choose Show children]
  end
  subgraph browser[Browser]
    kind{What did the developer do?}
    wide{Window 1024px or wider?}
    selected{Item already selected?}
    select[Set select, mark the item, show the details panel]
    keep[Keep the item selected]
    page[Open the bead page and remember the place for Back]
    loaded{Bead loaded?}
    error[Show the error and Retry inside the panel]
    choice{Next action}
    close[Clear select, close the panel, focus the item]
    scope[Set scope to the bead, clear select, draw its children]
    other[Keep select in the new view, note Not in the current list when it is not drawn]
    done(((End)))
  end
  start --> act
  act --> kind
  kind -->|1b title link| page
  kind -->|5 double click| page
  kind -->|1 click or 1c Enter| wide
  wide -->|1a narrower| page
  wide -->|2 wide| selected
  selected -->|2 not selected| select
  selected -->|4 selected, click| keep
  selected -->|5 selected, Enter| page
  select --> loaded
  loaded -->|2e failed| error
  loaded -->|2 loaded| read
  error --> done
  keep --> read
  read --> next
  next --> choice
  choice -->|4 click again| keep
  choice -->|5 open| page
  choice -->|3a close or Escape| close
  choice -->|3b Show children| scope
  choice -->|3c change view| other
  close --> done
  scope --> act
  other --> read
  page --> done
```
