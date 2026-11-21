# Details panel

When the List view, the Graph view (on the Beads page and on the Graph tab of an epic page) and the Lanes view show the details panel, from 1024px (REQ-UI-045, REQ-UI-051, REQ-UI-052, REQ-UI-106, REQ-UI-119).

```mermaid
flowchart TD
  open([View shown or URL changes]) --> sel{select in the URL?}
  sel -- "a bead id" --> show[Show the panel beside the content]
  sel -- "none" --> full[No panel, content at full width]
  sel -- absent --> full
  show --> act{User action}
  act -- "Close details" --> clear[Clear the selection: no select in the List, select=none in a graph]
  act -- "Escape outside a text field" --> clear
  act -- "select another bead" --> show
  clear --> focus[Focus the row or node that was selected] --> full
  full --> pick{User selects a bead?}
  pick -- yes --> show
```
