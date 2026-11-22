# Legend and tooltips

How a reader gets the meaning of a mark or a count: a tooltip on hover or focus, or the Legend panel on a click or tap (REQ-UI-132, REQ-UI-133).

Use case: read-a-definition

```mermaid
flowchart TD
  subgraph reader[Team member]
    start((Start))
    point[Rest the pointer on a mark, or focus it]
    legend[Open Legend in the page header]
    leave[Move away, blur, or press Escape]
    close[Press Escape, tap outside, or use the control]
  end
  subgraph browser[Browser]
    how{Pointer or focus available on the mark?}
    tip[Show the tooltip within 500 ms, tied by aria-describedby]
    hide[Close the tooltip]
    panel[Open the panel with every mark and definition]
    back[Close the panel and return focus to Legend]
    finish(((End)))
  end
  start --> how
  how -->|1 yes| point
  how -->|1a no| legend
  point --> tip
  tip --> leave
  leave --> hide
  hide --> finish
  legend --> panel
  panel --> close
  close --> back
  back --> finish
```
