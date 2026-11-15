# Design: Details panel only while a bead is selected

Epic: gin-console-be9

## Architecture

Frontend only, in `frontend/src/features/beads/`. No API change and no new dependency.

- **`DetailsPanel.tsx` (new).** The `<aside aria-label="Bead details">` that the three views now repeat. It holds the `SIDE_PANEL` classes, a header row with a "Close details" icon button (`X` from lucide-react, `aria-label="Close details"`), and the embedded `BeadDetailPage`.
  - Props: `{ project, id, graphScope?, notInList?, onClose }`.
  - It renders only when a bead is selected; the caller decides.
  - Any focus return happens in the caller.
- **`ListView.tsx`**
  - The grid is `lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]` only while `filters.select !== ""`, and a single column otherwise.
  - The empty `<aside>` with "Select a bead to see its details" goes.
  - `onClose` calls `onChange({ ...filters, select: "" })`, then focuses the row of the old selection through its `data-row` or id attribute.
  - Escape: the row key handler (`treeKeys.ts` `treeKeyDown`, wired at `ListView.tsx:104`) clears the selection on Escape. The handler lives on the tree rows, so it never fires from a text field, and the search box keeps its own Escape behaviour from `useCardKeys` (REQ-UI-037).
- **`GraphView.tsx` and `GraphPage.tsx`**
  - `select=none` is a reserved value: it means no selection and no fallback to the scope bead.
  - A missing `select` falls back to the scope bead as today, or to nothing on the project scope.
  - The grid has two columns only while a bead is selected; otherwise the graph takes the full width.
  - "Close details" sets `select=none`.
  - `onEscape`:
    - when the selected bead is not the scope bead, it selects the scope bead (unchanged);
    - when the scope bead is selected, or on the project scope any bead is selected, it sets `select=none`.
  - After closing, focus goes to the node that was selected, through its `data-node` button.
  - In GraphView, `select` comes from `filters.select`. In GraphPage, it comes from the `?select=` query it already owns.
- **`filters.ts`.** `select` stays a string, and `"none"` round-trips like any id. The id `none` cannot clash with a bead id, because bead ids carry a prefix such as `ex-`.

## Data Flow

- The panel states and actions are described in `docs/specs/ui/diagrams/details-panel-activity.md`.
- The selection lives only in the URL (`select`), as today. Closing the panel is a URL change with `replace: true`, so it adds no history entry (REQ-UI-051).

## Error Handling

- `select` that names a bead that is not loaded behaves as today. The List shows the bead with "Not in the current list", and the graph falls back to the scope bead.
- If the row or node to focus is gone after closing, for example because it was filtered out, focus moves to the List's first row or the canvas's tab stop.

## Testing

- vitest. Each test carries its REQ-ID.
  - **`ListView.test.tsx`** (REQ-UI-045):
    - Without `select`, there is no "Bead details" landmark and the grid has no second column class.
    - With `select`, the panel shows.
    - "Close details" clears `select` and focuses the row.
    - Escape on a focused row clears it.
    - Escape in the search box clears the text and keeps `select`.
  - **`GraphView.test.tsx`** (REQ-UI-106, REQ-UI-051, REQ-UI-052):
    - The project scope has no panel.
    - On a milestone scope, the scope bead is selected with the panel.
    - "Close details" sets `select: "none"`.
    - Escape from another node selects the scope. Escape on the scope sets `select: "none"`.
  - **`GraphPage.test.tsx`** (REQ-UI-051, REQ-UI-052):
    - The project page has no panel.
    - "Close details" writes `?select=none`.
    - A reload with `select=none` keeps the panel closed.
  - **`DetailsPanel.test.tsx`**: the close button has its name and calls `onClose`.
- jsdom cannot measure width, so tests assert the grid classes. TC-1 measures the real widths with Playwright at 1440×900.

## Open Technical Questions
