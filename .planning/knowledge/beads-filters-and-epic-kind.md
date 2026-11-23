# Bead filters and epic kind, capabilities and estimate

**Context**
Epic gin-console-it2 (2026-11-15) added the Kind and Capability filters and showed an epic's kind, capabilities, complexity and estimate in the Beads views. gin-workflow puts the kind in a `kind:` label, the capabilities on a `Capabilities:` line of a roadmap epic's description (empty in every project at the time), and each SDD track's capability in its `req:REQ-<CAP>-<NNN>` labels.

**Decision/Solution**
- The backend derives the fields in the bead list (`backend/src/gin_console/beads/kinds.py`, `source.py` `_fields`): `kind` for epics (default `capability`), `capabilities` from the `Capabilities:` line plus `req:` labels plus, for an epic, its children's `req:` labels, `complexity` from a `Complexity:` line, `estimate_minutes` from `estimated_minutes` above 0. The bead list still has no description.
- The frontend reads an unknown `kind` or `complexity` as null instead of rejecting the response, so a newer backend cannot blank the Beads page (`frontend/src/features/beads/api.ts`).
- A new filter needs three places: `filters.ts` (`filterBeads`, parse/write), an entry in `FILTER_DEFS` of `filterDefs.ts` (since gin-console-rm-beads-views it renders the bar chip or the "More filters" entry, the phone sheet section and every filter count, the breadcrumb's included), and the `filtering` condition in `ListView.tsx`, which decides on its own whether to run `filterBeads`; missing the last one makes the List view ignore the filter while Board, Focus and Graph apply it ([beads-views-interaction](beads-views-interaction.md)).
- Small badges next to a title must give way (`min-w-0 shrink truncate` with `title`), not `shrink-0`: a `shrink-0` badge overflowed the 262px List title cell with the details panel open and squeezed the Gantt title to one letter on a phone. On the Gantt the badge sits on the meta line, which wraps below lg.

**Consequences**
- Class-only tests in jsdom cannot catch these layout regressions; the Playwright TC with the example project (long-text and kind data) caught both.

**References**
- `frontend/src/features/beads/{filters.ts,ListView.tsx,Breadcrumb.tsx,KindBadge.tsx,estimate.ts,api.ts}`, `frontend/src/features/milestones/GanttChart.tsx`
- Change: `docs/changes/archive/2026-11-15-gin-console-it2-kind-capabilities/`; evidence `qa/evidence/2026-11-15-it2-tc1-run2/`
- Beads: gin-console-it2 (tracks .1–.5); related [milestone-retro-and-workflow-catchup](milestone-retro-and-workflow-catchup.md)

**Scope**
Adding or changing a Beads filter, and any badge or chip placed next to a truncated title.
