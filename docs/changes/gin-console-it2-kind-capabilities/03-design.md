# Design: Epic kind and capabilities in the Beads views

Epic: gin-console-it2

## Architecture

- **Backend (`backend/src/gin_console/beads/`)**
  - `kinds.py` (new) holds the pure helpers:
    - `kind_of(issue_type, labels) -> Literal["capability","technical","parity"] | None` returns `None` unless the issue type is `epic`. It returns `technical` or `parity` when the bead has that `kind:` label, and `capability` otherwise.
    - `declared_capabilities(description) -> list[str]` finds the first line that starts with `Capabilities:`, splits it on commas, strips each name and a trailing `(new)`, and drops empty names.
    - `req_capabilities(labels) -> list[str]` maps each `req:REQ-<CAP>-<NNN>` label to `<CAP>.lower()`. `<CAP>` may contain hyphens, as in `MILESTONE-UI`, and `<NNN>` is digits.
  - `models.py`: `BeadSummary` gains four fields:
    - `kind: Literal[...] | None = None`
    - `complexity: Literal["low","medium","high"] | None = None`, from `complexity_of(description)`
    - `capabilities: list[Text] = []`
    - `estimate_minutes: int | None = None`
  - `source.py`: where it builds the summaries, it computes `capabilities`:
    - The base set is the declared capabilities plus those of the bead's own `req:` labels.
    - An epic also gets the `req:` capabilities of its children, collected from the parent map that is already built for `milestone`.
    - The set is sorted and deduplicated.
    
    It reads `estimated_minutes` from the export row.
  - The description is read from the export only to compute `capabilities`. The bead list still leaves the description out (REQ-BEADS-001).
- **Frontend (`frontend/src/features/beads/`)**
  - `api.ts`: `BeadSummary` gains `kind`, `capabilities` and `estimate_minutes`. The shape check accepts the fields missing, with defaults `null`, `[]` and `null`, so an older backend still works.
  - `filters.ts`:
    - `BeadFilters` gains `kind: "" | "capability" | "technical" | "parity"` and `capability: string[]`. They are parsed and written as `kind` and `capability` (comma-separated, like `label`).
    - `filterBeads` matches `kind` and `capability` against the bead or its nearest epic ancestor, using `byId` and the parent chain.
    - `optionsOf` adds `capabilities`.
  - `BeadFilterBar.tsx` and `MobileFiltersSheet.tsx` gain a Kind select and a Capability multi-select. The multi-select reuses the Labels popover pattern, and it is hidden when `options.capabilities` is empty.
  - `Breadcrumb.tsx`: `activeFilters` counts `kind` and `capability`.
  - `KindBadge.tsx` (new) renders nothing for `capability` or `null`, and "Technical" or "Parity" as a `Badge` otherwise. It is used by:
    - `ListRow.tsx`, next to the title;
    - `BeadCard.tsx`;
    - `BeadDetailPage.tsx`, in the badges row;
    - `milestones/GanttChart.tsx`, on the epic label. The Gantt rows come from `gin milestone show`, which has no kind, so the Gantt looks the epic up in the beads it already loads (`useBeads`).
  - `estimate.ts` (new): `daysOf(minutes) = Math.round(minutes / 480 * 10) / 10`, written "<n>d".
  - `BeadDetailPage.tsx` shows capability chips and "Estimate <n>d".
  - `ListRow.tsx`: an epic row shows "<complexity> · <n>d", or either part alone, inside the clip-first group. The complexity comes from `complexity.ts`. The List has no description, so it uses a `complexity` field added to `BeadSummary` by the backend from the `Complexity:` line, through the same `kinds.py` helper (`complexity_of(description)`).
- **Example project (`scripts/make_example_project.py`, `scripts/README.md`):**
  - `ex-e8` gets `kind:technical` and `ex-e11` gets `kind:parity`.
  - `ex-e3` gets `Capabilities: checkout, ui` and `Complexity: medium (...)`.
  - The tracks of `ex-e3` and `ex-e4` get `req:REQ-CHECKOUT-00n` and `req:REQ-UI-00n` labels.
  - `check()` verifies them.

## Data Flow

See `docs/specs/beads/diagrams/kind-capabilities-activity.md`: export rows → `kinds.py` helpers → `BeadSummary` → `/api/beads` → filters and views.

## Error Handling

- **`Capabilities:` line** that is empty or contains only `(new)`: no names.
- **Malformed `req:` label** that does not match `REQ-<CAP>-<digits>`: ignored.
- **Unknown `kind:` value**, such as `kind:foo`: treated as `capability`, as gin-workflow does by default.
- **Several `kind:` labels:** the first one in label order wins. gin-workflow refuses this case, and the console only reads.
- **`estimated_minutes`** that is 0 or negative: shown as no estimate.

## Testing

- **pytest:**
  - `test_beads_kinds.py` covers:
    - `kind_of`;
    - `declared_capabilities` with an empty line, `(new)` and extra spaces;
    - `req_capabilities` with `MILESTONE-UI`, malformed labels and duplicates;
    - `complexity_of`.
  - `test_beads_api.py` covers the REQ-BEADS-001 scenarios "Kind, capabilities and estimate" and "Defaults".
- **vitest:**
  - `filters.test.ts`: URL round trip, Kind matching through the epic ancestor, Capability matching.
  - `BeadFilterBar` and mobile sheet tests: the filters render, and the Capability filter is hidden when there is no capability.
  - `KindBadge.test.tsx`.
  - `estimate.test.ts`: 480 gives 1d, 240 gives 0.5d, 1440 gives 3d.
  - `ListView`, `BeadCard`, `BeadDetailPage` and `GanttChart` tests for the badge, the chips and the estimate.
  - `Breadcrumb.test.tsx` for the filter count.
- **Example project:** `check()` covers it, and ruff and mypy pass on the script.
- **TC-1:** run with Playwright on the deployed console with the regenerated example.

## Open Technical Questions
