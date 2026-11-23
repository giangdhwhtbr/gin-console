# My Tasks

How the My Tasks page loads the beads assigned to the signed-in email in the current project (REQ-UI-100, REQ-UI-101, REQ-UI-102).

```mermaid
flowchart TD
  open([User opens /my-tasks or presses Refresh]) --> load[GET /api/beads for the current project, with closed=1 when the URL has it]
  load --> failed{Request failed?}
  failed -- yes --> alert([Show an error naming the project])
  failed -- no --> match[Keep beads whose assignee equals the email or its part before @, ignoring case]
  match --> any{Any bead kept?}
  any -- no --> empty([Say No tasks assigned to the email, with a link to the Beads page])
  any -- yes --> list([List rows by priority, then newest update, with the count])
```
