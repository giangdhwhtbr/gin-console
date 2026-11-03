# The sidebar column grows with the page

**Context**
From 768px the "Main" navigation sits in a column of `Layout` (`frontend/src/app/Layout.tsx`) inside a `min-h-screen` flex row. The column is not sticky and has no fixed height, so it is as tall as the page. Track 1 of gin-console-0ct put the theme and collapse controls at its bottom with `md:mt-auto`; on a long page (Board, List, Gantt) they ended up below the fold and the user had to scroll to reach them.

**Decision/Solution**
Controls that must always be reachable go at the top of the column, in the brand row (`ICON_BUTTON` icons from `ThemeToggle.tsx`). The user chose this over a sticky sidebar on 2026-11-03.

**Consequences**
- Do not anchor anything to the bottom of the column with `mt-auto` unless the column becomes sticky (`md:sticky md:top-0 md:h-screen`).
- The expanded brand row is full: 224px minus padding holds the brand mark, "gin-console" (`whitespace-nowrap`) and two 32px icons. A third control needs a different home or a sticky column.
- jsdom has no layout, so placement is tested by document order (controls before the "Main" navigation) and checked by hand at 1280px, 820px and 390px.

**References**
- REQ-UI-094 and REQ-UI-056 in `docs/specs/ui/spec.md`
- `docs/changes/archive/2026-11-03-gin-console-0ct-sidebar-collapse/`
- Beads gin-console-0ct.1, gin-console-0ct.3

**Scope**
Frontend shell (`frontend/src/app/Layout.tsx`, `ThemeToggle.tsx`) from 768px.
