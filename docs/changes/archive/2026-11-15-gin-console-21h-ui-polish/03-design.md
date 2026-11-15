# Design: UI polish

Epic: gin-console-21h

## Architecture

The change is mostly in the frontend. The backend changes in one place: the milestone list model. No new dependency.

**Shared long-text pieces** (`frontend/src/`):
- `lib/shortId.ts` (new) exports `shortId(id: string): string`. An id of 24 characters or fewer is returned as is. A longer id becomes `id.slice(0, 14) + "…" + id.slice(-9)`.
- Each place renders the shortened id with `title={id}`:
  - `ListRow.tsx`;
  - `BeadCard.tsx`;
  - `GraphNode.tsx`;
  - the Gantt id label in `GanttChart.tsx`.
- Tailwind 4.3's `wrap-anywhere` utility (`overflow-wrap: anywhere`) is applied to:
  - the BeadCard title and assignee;
  - the BeadDetailPage `h1` and its owner and assignee line;
  - the comment text.
- Page-level sideways scrolling comes from flex and grid children without `min-w-0`. The bead page, the Dependencies side panel and the Graph view grid get `min-w-0` on the columns that hold Markdown, so `.markdown pre` and `.markdown table` scroll inside their own box. They already have `overflow-x: auto`.
- Every `truncate` that shows user text gets a `title`:
  - the ListRow title and assignee;
  - the MilestonesPage name link;
  - `BarRows.tsx` row keys (the member emails);
  - the GanttChart meta spans.

**Views:**
- `ListRow.tsx`:
  - The id span becomes `min-w-0 truncate` with `shortId`.
  - The title span gets `min-w-32`, which is 8rem.
  - The track bar, "Prep x/y" and labels keep their container-query visibility, so on a narrow row they hide before the title shrinks below 8rem.
  - The open/close control stays `shrink-0` and is placed before any shrinking item.
- `GraphNode.tsx`:
  - The status row becomes `flex min-w-0 items-center gap-2 whitespace-nowrap`.
  - The StateMark label sits in a `min-w-0 truncate` span.
  - "n of m done" is `shrink-0`.
  - The id uses `shortId`.
  - `NODE.h` is unchanged.
- `graph.ts`:
  - `layout()` separates the inside nodes that have no edge, and so neither blocker nor blocked, from the layered nodes. Layers and the barycenter order apply to the linked nodes only.
  - Unlinked nodes are sorted by `byImportance` (priority, then id) and get `layer = layers + i / 3` and `order = i % 3`. Their `group` flag is `"unlinked"`.
  - `place()` puts the unlinked group after the last layer, with one row gap.
  - `GraphNode` gains `group: "layer" | "unlinked"`.
  - `GraphCanvas` draws the heading "n without dependencies" above the group at the group's first `y`.
  - With "Only linked" on, the group is empty, as today.
  - `GraphPage` and `GraphView` keep their own "n without dependencies" counter for the hidden nodes, unchanged.
- `GanttChart.tsx`: the meta container becomes `flex flex-wrap lg:flex-nowrap`. Below `lg` the spans are `shrink-0`, each with a `title`, so they wrap onto further lines. From `lg` up the current behaviour stays.
- `reports/team/TeamSection.tsx`:
  - `selectClass` adds `max-w-full min-w-0`.
  - The labels become `flex min-w-0 max-w-full`.
  - The Project select in `ReportsPage.tsx` gets the same classes.

**Undated milestone:**
- Backend:
  - In `milestones/models.py`, `MilestoneEntry.start` and `.end` become `IsoDate | None`.
  - `source.py` is unchanged; validation now passes.
- Frontend:
  - In `milestones/api.ts`, `MilestoneEntry.start` and `.end` become `string | null`.
  - The shape check accepts `null`.
  - `MilestonesPage.tsx` shows "No dates" when either is `null`, and the entry's `error` as it already does.
  - Any sort or forecast that uses `start` treats `null` as last.
  - The milestone page of such an entry shows the error that `gin milestone show` returns through the existing `MilestoneError`.

## Data Flow

- Graph placement: `docs/specs/ui/diagrams/graph-layout-activity.md`.
- Milestones list: `gin milestone list --all --json` → `MilestoneList` (backend) → `GET /api/milestones` → `MilestonesPage`. Only the `start` and `end` types change.

## Error Handling

- An undated milestone no longer fails validation. A real schema error still gives the existing 502 `cause: "schema"` path.
- `shortId` is total: any string in, a string out, never throws.
- An empty unlinked group draws no heading.

## Testing

- vitest, each test carrying its REQ-ID:
  - `lib/shortId.test.ts` (REQ-UI-107).
  - `ListView.test.tsx`, long id row (REQ-UI-044).
  - `BoardView.test.tsx` or `BeadCard` test, shortened id and title wrap class (REQ-UI-065, REQ-UI-107).
  - `graph.test.ts`, unlinked rows of 3 and the linked-plus-unlinked case (REQ-UI-048).
  - `GraphCanvas.test.tsx` or `GraphView.test.tsx`, heading "n without dependencies" (REQ-UI-048).
  - `GraphNode` state line and shortened id (REQ-UI-049).
  - `GanttChart.test.tsx`, wrap below lg (REQ-MILESTONE-UI-013).
  - `ReportsPage.test.tsx`, select classes (REQ-REPORTS-012).
  - `MilestonesPage.test.tsx`, "No dates" (REQ-MILESTONE-UI-001).
  - `BeadDetailPage.test.tsx` and `MarkdownView.test.tsx`, heading wrap and the `min-w-0` containers (REQ-UI-107).
- jsdom does not lay out. Tests assert the classes and the `title` attributes that carry the behaviour, and TC-1 checks the real layout.
- pytest: `test_milestones_api.py`, an entry without dates gives 200 with nulls (REQ-MILESTONE-UI-008).
- TC-1: the long-text sweep with Playwright on the deployed console, at 1440×900 and 390×844, with an undated milestone added to a copy of the example project.

## Open Technical Questions
