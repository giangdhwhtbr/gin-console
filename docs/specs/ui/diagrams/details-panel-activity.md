# Details panel

When the List view, the Graph view and the Dependencies page show the details panel, from 1024px (REQ-UI-045, REQ-UI-051, REQ-UI-052, REQ-UI-106).

```mermaid
flowchart TD
  open([View shown or URL changes]) --> sel{select in the URL?}
  sel -- "a bead id" --> show[Show the panel beside the content]
  sel -- "none" --> full[No panel, content at full width]
  sel -- absent --> graph{Graph or Dependencies with a bead scope?}
  graph -- yes --> scope[Select the scope bead] --> show
  graph -- no --> full
  show --> act{User action}
  act -- "Close details" --> clear[Clear the selection: no select in the List, select=none in a graph]
  act -- "Escape outside a text field" --> esc{Graph view with another node than the scope selected?}
  esc -- yes --> scope
  esc -- no --> clear
  act -- "select another bead" --> show
  clear --> focus[Focus the row or node that was selected] --> full
```
