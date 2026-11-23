# Details panel

When the List, Board, Focus, Graph and Lanes views show the details panel, on the Beads page, the Beads tab of a milestone page and the Graph and Lanes tabs of an epic page (REQ-UI-045, REQ-UI-051, REQ-UI-052, REQ-UI-106, REQ-UI-119, REQ-UI-147, REQ-UI-148, REQ-UI-149).

```mermaid
flowchart TD
  open([View shown, URL or window width changes]) --> wide{Window 1024px or wider?}
  wide -- no --> noPanel[No panel, a click on an item opens the bead page]
  wide -- yes --> sel{select in the URL?}
  sel -- "a bead id" --> drawn{Bead drawn in this view?}
  sel -- "none" --> full[No panel, content at full width]
  sel -- absent --> full
  drawn -- yes --> show[Show the panel beside the view and mark the item]
  drawn -- no --> note[Show the panel with the note Not in the current list]
  show --> act{User action}
  note --> act
  act -- "Close details" --> clear[Clear the selection: no select in List, Board and Focus, select=none in Graph and Lanes]
  act -- "Escape outside a text field" --> clear
  act -- "select another bead" --> drawn
  act -- "Show children in Graph or Lanes, bead with children" --> scope[Set scope to the bead and remove select]
  act -- "Open page, double click, or Enter on the selected item" --> page([Open the bead page])
  clear --> focus[Focus the row, card or node that was selected] --> full
  scope --> full
  full --> pick{User selects a bead?}
  pick -- yes --> drawn
```
