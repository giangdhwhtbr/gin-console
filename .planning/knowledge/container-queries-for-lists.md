# Fixed-column lists use container queries, not window breakpoints

**Context**
Bug gin-console-bah (2026-11-19): the Milestones list switched to six fixed columns (`md:grid-cols-[8rem_minmax(0,1fr)_11rem_5rem_9rem_7rem]`) at a 768px window. Beside the navigation column the main area at an 800px window is about 670px, less than the fixed columns need, so the title column collapsed to 0px, ids wrapped letter by letter, headers overlapped and the Warnings column overflowed.

**Decision/Solution**
- `md:`/`lg:` measure the window, not the main area. A list with fixed columns switches layout by container query: an `@container min-w-0` wrapper and `@4xl:` on the rows and the header, as `frontend/src/features/beads/ListView.tsx` and `ListRow.tsx` do. The container cannot be the `ul` itself, because a container query applies only to descendants.
- Pick the container size from the columns' sum plus room for the flexible column: the Milestones list needs about 45rem fixed plus about 10rem of title, so `@4xl` (56rem).
- A hyphenated id such as `ex-m4` wraps at the hyphen in a shrinking flex item; keep short ids `shrink-0` and let the title give way with `min-w-0 truncate`.

**Consequences**
- Windows from 768px to about 1100px (collapsed navigation) or 1280px (expanded) show the stacked row without the header.
- jsdom has no container queries: unit tests can only assert the classes; measure real widths with Playwright.

**References**
- `frontend/src/features/milestones/MilestonesPage.tsx`, `frontend/src/features/beads/{ListView.tsx,ListRow.tsx}`
- Beads: gin-console-bah (discovered from gin-console-y4j, TC-UI-120); related [e2e-parallel-runs-and-ellipsis](e2e-parallel-runs-and-ellipsis.md), [beads-filters-and-epic-kind](beads-filters-and-epic-kind.md)

**Scope**
Any list or table with fixed column widths shown beside the navigation column.
